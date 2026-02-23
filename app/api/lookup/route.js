import { NextResponse } from 'next/server';

export async function POST(request) {
    const { reservationId, phone } = await request.json();

    if (!reservationId || !phone) {
        return NextResponse.json(
            { error: '受付番号と電話番号を入力してください。' },
            { status: 400 }
        );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = encodeURIComponent('内見予約');

    const filterFormula = encodeURIComponent(
        `AND({受付番号}='${reservationId}',{電話番号}='${phone}',{ステータス}='予約中')`
    );

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}?filterByFormula=${filterFormula}`,
            {
                headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
                cache: 'no-store',
            }
        );
        const data = await response.json();

        if (!data.records || data.records.length === 0) {
            return NextResponse.json(
                { error: '予約が見つかりませんでした。受付番号と電話番号をご確認ください。' },
                { status: 404 }
            );
        }

        const record = data.records[0];
        return NextResponse.json({
            recordId: record.id,
            fields: record.fields,
        });
    } catch (err) {
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。' },
            { status: 500 }
        );
    }
}
