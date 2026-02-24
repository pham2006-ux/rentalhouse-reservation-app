import { NextResponse } from 'next/server';

export async function POST(request) {
    const { recordId, fields } = await request.json();

    if (!recordId || !fields) {
        return NextResponse.json(
            { error: '必要なデータが不足しています。' },
            { status: 400 }
        );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = encodeURIComponent('内見予約');

    // If date or property is being changed, check availability first
    if (fields['内見希望日時'] || fields['物件名']) {
        try {
            // Get current record to merge existing values
            const currentRes = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`,
                {
                    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
                    cache: 'no-store',
                }
            );
            const currentData = await currentRes.json();
            const currentFields = currentData.fields || {};

            const checkProperty = fields['物件名'] || currentFields['物件名'];
            const checkDateTime = fields['内見希望日時'] || currentFields['内見希望日時'];

            if (checkProperty && checkDateTime) {
                const requestedDate = new Date(checkDateTime);
                const hourStart = new Date(requestedDate);
                hourStart.setMinutes(0, 0, 0);
                const hourEnd = new Date(hourStart);
                hourEnd.setHours(hourStart.getHours() + 1);
                const hour = hourStart.getHours();

                // Business hours check
                if (hour < 10 || hour >= 16) {
                    return NextResponse.json(
                        { error: '内見対応時間は10:00〜16:00です。この時間帯でご指定ください。' },
                        { status: 400 }
                    );
                }

                // Wednesday check
                if (requestedDate.getDay() === 3) {
                    return NextResponse.json(
                        { error: '水曜日は定休日のため、内見のご予約を承ることができません。' },
                        { status: 400 }
                    );
                }

                // Duplicate check (exclude self)
                const startISO = hourStart.toISOString();
                const endISO = hourEnd.toISOString();
                const filterFormula = encodeURIComponent(
                    `AND({物件名}='${checkProperty}',{ステータス}='予約中',IS_AFTER({内見希望日時},'${startISO}'),IS_BEFORE({内見希望日時},'${endISO}'),RECORD_ID()!='${recordId}')`
                );

                const dupRes = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}?filterByFormula=${filterFormula}`,
                    {
                        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
                        cache: 'no-store',
                    }
                );
                const dupData = await dupRes.json();

                if (dupData.records && dupData.records.length > 0) {
                    return NextResponse.json(
                        { error: `${checkProperty}の${hour}:00〜${hour + 1}:00は既に予約が入っています。別の時間帯をお選びください。` },
                        { status: 409 }
                    );
                }
            }
        } catch (err) {
            // Continue with update even if check fails
            console.error('Availability check error:', err);
        }
    }

    // Proceed with update
    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields }),
            }
        );
        const data = await response.json();

        if (data.error) {
            return NextResponse.json(
                { error: data.error.message || '更新に失敗しました。' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, fields: data.fields });
    } catch (err) {
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。' },
            { status: 500 }
        );
    }
}
