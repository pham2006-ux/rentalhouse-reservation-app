import { NextResponse } from 'next/server';

export async function POST(request) {
    const { recordId } = await request.json();

    if (!recordId) {
        return NextResponse.json(
            { error: 'レコードIDが必要です。' },
            { status: 400 }
        );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = encodeURIComponent('内見予約');

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields: { 'ステータス': 'キャンセル済み' } }),
            }
        );
        const data = await response.json();

        if (data.error) {
            return NextResponse.json(
                { error: data.error.message || 'キャンセルに失敗しました。' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。' },
            { status: 500 }
        );
    }
}
