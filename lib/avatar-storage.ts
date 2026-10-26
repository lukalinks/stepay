import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function avatarUploadDir(): string {
    if (process.env.AVATAR_UPLOAD_DIR?.trim()) {
        return process.env.AVATAR_UPLOAD_DIR.trim();
    }
    // Persist outside deploy rsync on VPS
    if (existsSync('/var/www/stepay-data')) {
        return '/var/www/stepay-data/avatars';
    }
    return path.join(process.cwd(), 'uploads', 'avatars');
}

export function avatarPublicPath(userId: string): string {
    return `/api/user/avatar/${userId}`;
}

function extForMime(mime: string): string {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'jpg';
}

export async function saveUserAvatar(
    userId: string,
    buffer: Buffer,
    mime: string
): Promise<{ url: string; filePath: string }> {
    if (!ALLOWED.has(mime)) {
        throw new Error('Use a JPG, PNG, or WebP image.');
    }
    if (buffer.length > MAX_BYTES) {
        throw new Error('Image must be under 2 MB.');
    }

    const dir = avatarUploadDir();
    await mkdir(dir, { recursive: true });

    // Remove prior extensions for this user
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        const prev = path.join(dir, `${userId}.${ext}`);
        if (existsSync(prev)) {
            await unlink(prev).catch(() => {});
        }
    }

    const ext = extForMime(mime);
    const filePath = path.join(dir, `${userId}.${ext}`);
    await writeFile(filePath, buffer);
    return { url: avatarPublicPath(userId), filePath };
}

export async function readUserAvatar(
    userId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
    const dir = avatarUploadDir();
    for (const [ext, contentType] of [
        ['jpg', 'image/jpeg'],
        ['jpeg', 'image/jpeg'],
        ['png', 'image/png'],
        ['webp', 'image/webp'],
    ] as const) {
        const filePath = path.join(dir, `${userId}.${ext}`);
        if (!existsSync(filePath)) continue;
        const buffer = await readFile(filePath);
        return { buffer, contentType };
    }
    return null;
}

export async function deleteUserAvatar(userId: string): Promise<void> {
    const dir = avatarUploadDir();
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        const filePath = path.join(dir, `${userId}.${ext}`);
        if (existsSync(filePath)) {
            await unlink(filePath).catch(() => {});
        }
    }
}
