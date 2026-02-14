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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Users</h2>
                <p className="text-sm text-slate-500 mt-1">{total} total</p>
                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by email or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
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
                        <thead className="bg-slate-50 text-left">
                            <tr>
                                <th className="px-6 py-3 font-medium text-slate-600">Email</th>
                                <th className="px-6 py-3 font-medium text-slate-600">Phone</th>
                                <th className="px-6 py-3 font-medium text-slate-600">Role</th>
                                <th className="px-6 py-3 font-medium text-slate-600">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 text-slate-800">{u.email}</td>
                                    <td className="px-6 py-4 text-slate-600">{u.phone}</td>
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
                    <div className="py-12 text-center text-slate-500">No users found</div>
                )}
            </div>
        </div>
    );
}
