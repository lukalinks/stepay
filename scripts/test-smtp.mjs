#!/usr/bin/env node
import nodemailer from 'nodemailer';
import fs from 'node:fs';

for (const line of fs.readFileSync('/var/www/stepay/.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.argv[2] || process.env.SMTP_USER,
    subject: 'Stepay email test',
    html: '<p>Hostinger SMTP for noreply@stepay.pro is working.</p>',
});
console.log('SMTP_OK');
