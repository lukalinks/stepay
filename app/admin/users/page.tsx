'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search } from 'lucide-react';

interface UserRow {
    id: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    wallet: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchUsers = (s: string, offset: number) => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50', offset: String(offset) });
        if (s) params.set('search', s);
        fetch(`/api/admin/users?${params}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setUsers(data.users);
                    setTotal(data.total);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const t = setTimeout(() => fetchUsers(search, 0), 300);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Users</h1>
                <p className="mt-1 text-sm text-slate-500">{total} total registered users</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4 sm:px-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by email or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                        />
                    </div>
                </div>
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/80 text-left">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Email</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Phone</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Role</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-6 py-4 font-medium text-slate-800">{u.email || '—'}</td>
                                    <td className="px-6 py-4 text-slate-600">{u.phone || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && users.length === 0 && (
                    <div className="py-16 text-center text-slate-500">No users found. Try a different search.</div>
                )}
            </div>
            </div>
        </div>
    );
}
