'use client';

import Avatar from '@mui/material/Avatar';
import { getUserInitials } from '@/lib/user-display';

type UserAvatarProps = {
    fullName?: string | null;
    email?: string | null;
    size?: number;
    sx?: object;
};

export function UserAvatar({ fullName, email, size = 40, sx }: UserAvatarProps) {
    return (
        <Avatar
            sx={{
                width: size,
                height: size,
                fontSize: size * 0.38,
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                ...sx,
            }}
        >
            {getUserInitials({ fullName, email })}
        </Avatar>
    );
}
