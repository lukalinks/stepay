export function getDisplayName(user: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
}): string {
    const name = typeof user.fullName === 'string' ? user.fullName.trim() : '';
    if (name) {
        return name.split(/\s+/)[0] ?? name;
    }
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (email && email.includes('@')) {
        const local = email.split('@')[0] ?? 'there';
        return local.charAt(0).toUpperCase() + local.slice(1);
    }
    const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (phone) return phone;
    return 'there';
}

export function getTimeGreeting(date = new Date()): string {
    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function getUserInitials(user: {
    fullName?: string | null;
    email?: string | null;
}): string {
    const name = typeof user.fullName === 'string' ? user.fullName.trim() : '';
    if (name) {
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (email) return email.slice(0, 2).toUpperCase();
    return 'SP';
}
