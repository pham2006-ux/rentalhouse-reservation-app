import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Google Sheets API via Service Account JWT (no external dependencies)
async function getAccessToken() {
    const sa = JSON.parse(process.env.GOOGLE_SA_KEY);
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    })).toString('base64url');

    const signature = crypto
        .createSign('RSA-SHA256')
        .update(`${header}.${payload}`)
        .sign(sa.private_key, 'base64url');

    const jwt = `${header}.${payload}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    return tokenData.access_token;
}

export async function GET() {
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '15eF4SAqvAH2Xm8VCIEv_kMdmfhXeg1rxzs6Y6LgKvRE';
    const RANGE = encodeURIComponent('物件一覧!A:M');

    try {
        const token = await getAccessToken();
        const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            }
        );
        const data = await res.json();

        if (!data.values || data.values.length < 2) {
            return NextResponse.json({ properties: [] });
        }

        const headers = data.values[0];
        const properties = data.values.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = row[i] || ''; });
            return obj;
        });

        return NextResponse.json({ properties });
    } catch (err) {
        console.error('Google Sheets error:', err);
        return NextResponse.json(
            { error: '物件データの取得に失敗しました。', properties: [] },
            { status: 500 }
        );
    }
}
