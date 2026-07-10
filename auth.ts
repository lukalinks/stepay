import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import authConfig from '@/auth.config';
import { verifyUserCredentials } from '@/lib/verify-credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const email = typeof credentials?.email === 'string' ? credentials.email.trim() : '';
                const password = typeof credentials?.password === 'string' ? credentials.password : '';
                return verifyUserCredentials(email, password);
            },
        }),
    ],
});
