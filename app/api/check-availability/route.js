import { NextResponse } from 'next/server';

export async function POST(request) {
    const { property, dateTime, excludeRecordId } = await request.json();

    if (!property || !dateTime) {
        return NextResponse.json(
            { error: '物件名と日時を指定してください。' },
            { status: 400 }
        );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = encodeURIComponent('内見予約');

    // Parse the requested time and calculate the 1-hour window
    const requestedDate = new Date(dateTime);
    const hourStart = new Date(requestedDate);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourStart.getHours() + 1);

    // Check business hours (10:00-16:00, last entry 15:30)
    const hour = hourStart.getHours();
    if (hour < 10 || hour >= 16) {
        return NextResponse.json({
            available: false,
            reason: '内見対応時間は10:00〜16:00です。この時間帯でご指定ください。',
        });
    }

    // Check day of week (Wednesday = 3 is closed)
    if (requestedDate.getDay() === 3) {
        return NextResponse.json({
            available: false,
            reason: '水曜日は定休日のため、内見のご予約を承ることができません。',
        });
    }

    // Build filter: same property, same hour, active reservation, exclude self
    const startISO = hourStart.toISOString();
    const endISO = hourEnd.toISOString();

    let filterFormula = `AND({物件名}='${property}',{ステータス}='予約中',NOT(IS_BEFORE({内見希望日時},'${startISO}')),IS_BEFORE({内見希望日時},'${endISO}'))`;

    if (excludeRecordId) {
        filterFormula = `AND({物件名}='${property}',{ステータス}='予約中',NOT(IS_BEFORE({内見希望日時},'${startISO}')),IS_BEFORE({内見希望日時},'${endISO}'),RECORD_ID()!='${excludeRecordId}')`;
    }

    const encodedFilter = encodeURIComponent(filterFormula);

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}?filterByFormula=${encodedFilter}`,
            {
                headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
                cache: 'no-store',
            }
        );
        const data = await response.json();

        if (data.records && data.records.length > 0) {
            return NextResponse.json({
                available: false,
                reason: `${property}の${hour}:00〜${hour + 1}:00は既に予約が入っています。別の時間帯をお選びください。`,
            });
        }

        return NextResponse.json({ available: true });
    } catch (err) {
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。' },
            { status: 500 }
        );
    }
}
