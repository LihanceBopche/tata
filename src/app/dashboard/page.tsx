'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { PFM_HEADERS } from '@/lib/constants';
import { SUPER_HEADERS, SUB_HEADERS } from '@/lib/tableStructure';
import { DROPDOWN_OPTIONS } from '@/lib/dropdowns';
import { FIELD_GROUPS } from '@/lib/fieldGroups';
import toast from 'react-hot-toast';
import { Download, Plus, X, Loader2, Maximize2, Settings2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<Record<string, unknown> | null>(null);
    const [data, setData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const groupKeys = Object.keys(FIELD_GROUPS);
    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        if (groupKeys.length > 0 && !activeTab) {
            setActiveTab(groupKeys[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupKeys]);

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                const [userRes, dataRes] = await Promise.all([
                    fetch('/api/auth/me'),
                    fetch('/api/pfm')
                ]);
                if (!userRes.ok) {
                    router.push('/login');
                    return;
                }
                setContent(userRes, dataRes);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load data');
                setLoading(false);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setContent = async (userRes: any, dataRes: any) => {
            setUser((await userRes.json()).user);
            if (dataRes.ok) setData((await dataRes.json()).data || []);
            setLoading(false);
        };

        fetchUserAndData();
    }, [router]);

    const handleInputChange = (field: string, val: string) => {
        setFormData(prev => {
            const next = { ...prev, [field]: val };

            // The user requested to disable the dependent auto-fill logic:
            // DEPENDENT LOGIC 1: Auto-fill Synthetic Part No
            /*
            if (field === 'Engg Part Number' && val) {
                if (!prev['Synthetic Part No.'] || prev['Synthetic Part No.'] === prev['Engg Part Number'] + 'P' || prev['Synthetic Part No.'].includes(prev['Engg Part Number'])) {
                    next['Synthetic Part No.'] = val + 'P';
                }
            }
            */

            // DEPENDENT LOGIC 2: Heat Treatment disables tempers
            /*
            if (field === 'Heat Treatment Applicability') {
                if (val === 'No') {
                    next['Initial Temper'] = 'N/A';
                    next['Final Temper '] = 'N/A'; // Note the space in Final Temper 
                } else if (val === 'Yes') {
                    if (next['Initial Temper'] === 'N/A') next['Initial Temper'] = '';
                    if (next['Final Temper '] === 'N/A') next['Final Temper '] = '';
                }
            }
            */

            // DEPENDENT LOGIC 3: Material Concatenation
            /*
            if (['Alloy', 'Initial Temper', 'Sheet Thk (mm)', 'RM Sheet Length (mm)', 'RM Sheet Width (mm)'].includes(field)) {
                const alloy = next['Alloy'] || '';
                const temper = next['Initial Temper'] || '';
                const thk = next['Sheet Thk (mm)'] || '';
                const len = next['RM Sheet Length (mm)'] || '';
                const wid = next['RM Sheet Width (mm)'] || '';

                if (alloy && thk) {
                    next['Material with Concatenate'] = `TOLE ${alloy} ETAT=${temper} ${thk} X ${wid} X ${len}`.trim();
                }
            }
            */

            return next;
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/pfm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();

            if (res.ok) {
                setData([json.data, ...data]);
                toast.success('Record saved successfully!');
                setShowModal(false);
                setFormData({});
                setActiveTab(groupKeys[0]); // Reset tab
            } else {
                toast.error('Error from Server: ' + (json.error || 'Failed to save record.'));
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(e);
            toast.error('Network Error: ' + (e?.message || 'Failed while saving.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        const currentIdx = groupKeys.indexOf(activeTab);
        if (currentIdx < groupKeys.length - 1) {
            setActiveTab(groupKeys[currentIdx + 1]);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        const currentIdx = groupKeys.indexOf(activeTab);
        if (currentIdx > 0) {
            setActiveTab(groupKeys[currentIdx - 1]);
        }
    };

    const exportToExcel = () => {
        if (data.length === 0) {
            toast.error('No data to export');
            return;
        }

        // Build Header Rows setup similar to the original Excel
        const row0: string[] = [];
        const row1: string[] = [];
        const row2: string[] = PFM_HEADERS;
        const merges: XLSX.Range[] = [];

        let col0 = 0;
        SUPER_HEADERS.forEach(sh => {
            row0.push(sh.name);
            for (let i = 1; i < sh.colSpan; i++) row0.push('');
            if (sh.colSpan > 1) {
                merges.push({ s: { r: 0, c: col0 }, e: { r: 0, c: col0 + sh.colSpan - 1 } });
            }
            col0 += sh.colSpan;
        });

        let col1 = 0;
        SUB_HEADERS.forEach(sh => {
            row1.push(sh.name);
            for (let i = 1; i < sh.colSpan; i++) row1.push('');
            if (sh.colSpan > 1) {
                merges.push({ s: { r: 1, c: col1 }, e: { r: 1, c: col1 + sh.colSpan - 1 } });
            }
            col1 += sh.colSpan;
        });

        // Create a rows array mapped from the database based on headers
        const dataRows = data.map((item: any, idx) => {
            const rowArr: any[] = [];
            PFM_HEADERS.forEach(header => {
                if (header.includes('SR') && header.includes('NO')) {
                    rowArr.push(idx + 1);
                } else {
                    rowArr.push(item.data?.[header] || '');
                }
            });
            return rowArr;
        });

        const finalAoa = [row0, row1, row2, ...dataRows];
        const worksheet = XLSX.utils.aoa_to_sheet(finalAoa);
        worksheet['!merges'] = merges;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "PFM_R00");
        XLSX.writeFile(workbook, "Dassault_Rafale_PFM_Export.xlsx");
        toast.success('Export downloaded successfully!');
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-tata-blue w-8 h-8" /></div>;

    const currentIdx = groupKeys.indexOf(activeTab);
    const isFirstTab = currentIdx === 0;
    const isLastTab = currentIdx === groupKeys.length - 1;
    const progressPercent = ((currentIdx + 1) / groupKeys.length) * 100;

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <Navbar user={user} />

            <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-8 flex flex-col">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-tata-light rounded-lg">
                            <Settings2 className="w-5 h-5 text-tata-blue" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-tata-dark">Dassault Rafale Lateral Shell PFM</h1>
                            <p className="text-sm text-gray-500 font-medium">Record and manage manufacturing data</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowModal(true); setActiveTab(groupKeys[0]); }}
                            className="bg-tata-blue text-white px-5 py-2.5 rounded-lg hover:bg-tata-dark transition flex items-center justify-center gap-2 shadow font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add PFM Record
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow font-medium"
                        >
                            <Download className="w-4 h-4" /> Export Config Spreadsheet
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative">
                    {data.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Maximize2 className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 mb-1">No Data Found</h3>
                            <p className="text-sm mb-4">Click the &quot;Add PFM Record&quot; button to start logging rows.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1 max-h-[70vh] custom-scrollbar">
                            <table className="w-full text-sm text-left text-gray-600 border-collapse table-auto relative">
                                <thead className="text-xs font-semibold uppercase text-tata-dark sticky top-0 z-20 whitespace-nowrap shadow-sm bg-white">
                                    {/* Super Headers (Row 1) */}
                                    <tr className="bg-tata-dark text-white">
                                        {SUPER_HEADERS.map((sh, i) => (
                                            <th key={`super-${i}`} colSpan={sh.colSpan} className="px-5 py-2.5 border-r border-b border-tata-dark/20 text-center tracking-wider bg-tata-dark text-[11px]">{sh.name}</th>
                                        ))}
                                    </tr>
                                    {/* Sub Headers (Row 2) */}
                                    <tr className="bg-tata-blue text-white/90">
                                        {SUB_HEADERS.map((sh, i) => (
                                            <th key={`sub-${i}`} colSpan={sh.colSpan} className="px-5 py-2 border-r border-b border-white/10 text-center bg-tata-blue text-[11px]">{sh.name}</th>
                                        ))}
                                    </tr>
                                    {/* Actual Columns (Row 3) */}
                                    <tr className="bg-gray-100 text-gray-800">
                                        {PFM_HEADERS.map((h, i) => (
                                            <th key={`h-${i}`} className="px-5 py-3 border-r border-b border-gray-300 text-left bg-gray-100/95 backdrop-blur-sm shadow-[0_1px_0_0_#d1d5db]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {data.map((row: any, i) => (
                                        <tr key={row._id as string} className="hover:bg-tata-light/30 transition-colors group">
                                            {PFM_HEADERS.map((h, j) => (
                                                <td key={j} className="px-5 py-3 whitespace-nowrap border-r border-gray-100 last:border-0 group-hover:bg-tata-light/10">
                                                    {h.includes('SR') && h.includes('NO') ? i + 1 :
                                                        h === 'Part Snap' && row.data?.[h] ? (
                                                            <a href={row.data?.[h] as string} target="_blank" rel="noopener noreferrer">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={row.data?.[h] as string} alt="snap" className="max-w-[48px] max-h-[48px] object-cover rounded shadow-sm hover:scale-[3] transition-transform origin-left border border-gray-200" />
                                                            </a>
                                                        ) : (row.data?.[h] as string) || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Multistep Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">

                        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/80">
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-tata-dark flex items-center gap-3">
                                    Add New PFM Configuration
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-tata-light text-tata-blue rounded-full">
                                        Step {currentIdx + 1} of {groupKeys.length}
                                    </span>
                                </h2>
                                <div className="mt-2 w-full max-w-sm bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-tata-blue h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors ml-4 self-start"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                            <div className="flex flex-1 overflow-hidden">
                                {/* Sidebar Navigation */}
                                <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto hidden md:block">
                                    <ul className="p-3 space-y-1">
                                        {groupKeys.map((group, idx) => (
                                            <li key={group}>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab(group)}
                                                    // Let users click previously seen tabs but conceptually it's a wizard
                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === group
                                                        ? 'bg-tata-blue text-white shadow-sm'
                                                        : idx < currentIdx
                                                            ? 'text-tata-blue hover:bg-tata-light/50'
                                                            : 'text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {group}
                                                    {idx < currentIdx && activeTab !== group && <CheckCircle2 className="w-4 h-4 opacity-70" />}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Form Fields Area */}
                                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                                    <div className="sm:hidden flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-gray-100">
                                        {groupKeys.map(group => (
                                            <button
                                                key={group}
                                                type="button"
                                                onClick={() => setActiveTab(group)}
                                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${activeTab === group ? 'bg-tata-blue text-white' : 'bg-gray-100 text-gray-700'}`}
                                            >
                                                {group}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mb-2 animate-in slide-in-from-right-4 duration-300">
                                        <h3 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-6 border-gray-100">{activeTab} Info</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-6">
                                            {FIELD_GROUPS[activeTab]?.map((h, i) => (
                                                <div key={i} className="flex flex-col group">
                                                    <label className="text-xs font-bold text-tata-dark mb-1.5 uppercase tracking-wide truncate" title={h}>{h}</label>
                                                    {DROPDOWN_OPTIONS[h] ? (
                                                        <div className="relative">
                                                            <select
                                                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-tata-blue focus:ring-2 focus:ring-tata-blue/20 text-sm bg-white appearance-none shadow-sm transition-shadow hover:border-gray-400 cursor-pointer"
                                                                value={formData[h] || ''}
                                                                onChange={(e) => handleInputChange(h, e.target.value)}
                                                            >
                                                                <option value="" disabled className="text-gray-400">Select {h.toLowerCase()}</option>
                                                                {DROPDOWN_OPTIONS[h].map((opt, idx) => (
                                                                    <option key={idx} value={opt}>{opt}</option>
                                                                ))}
                                                                {formData[h] && !DROPDOWN_OPTIONS[h].includes(formData[h]) && (
                                                                    <option value={formData[h]} className="text-tata-blue font-bold italic">{formData[h]} (Auto)</option>
                                                                )}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                            </div>
                                                        </div>
                                                    ) : h === 'Part Snap' ? (
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-tata-blue focus:ring-2 focus:ring-tata-blue/20 text-sm bg-gray-50 focus:bg-white shadow-sm transition-all hover:border-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-tata-light file:text-tata-blue hover:file:bg-tata-blue/10"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const toastId = toast.loading('Uploading image...');
                                                                        const fileData = new FormData();
                                                                        fileData.append('file', file);
                                                                        try {
                                                                            const res = await fetch('/api/upload', {
                                                                                method: 'POST',
                                                                                body: fileData
                                                                            });
                                                                            const data = await res.json();
                                                                            if (res.ok) {
                                                                                handleInputChange(h, data.url);
                                                                                toast.success('Image uploaded successfully!', { id: toastId });
                                                                            } else {
                                                                                toast.error(data.error || 'Failed to upload image.', { id: toastId });
                                                                            }
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                            toast.error('Error uploading image.', { id: toastId });
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            {formData[h] && (
                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                </div>
                                                            )}
                                                            {formData[h] && (
                                                                <div className="mt-3">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={formData[h]} alt="Part Snap Preview" className="w-full max-h-48 object-contain rounded-md border border-gray-200 bg-gray-50 p-1" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            placeholder={`Enter ${h.toLowerCase()}...`}
                                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-tata-blue focus:ring-2 focus:ring-tata-blue/20 text-sm bg-gray-50 focus:bg-white shadow-sm transition-all hover:border-gray-400"
                                                            value={formData[h] || ''}
                                                            onChange={(e) => handleInputChange(h, e.target.value)}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Wizard Footer */}
                            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
                                        Cancel Process
                                    </button>
                                </div>

                                <div className="flex gap-3 items-center">
                                    {!isFirstTab && (
                                        <button
                                            type="button"
                                            onClick={handlePrev}
                                            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </button>
                                    )}

                                    {!isLastTab ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="px-6 py-2.5 bg-tata-accent text-white text-sm font-bold rounded-lg hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2 min-w-[140px]"
                                        >
                                            Save & Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-6 py-2.5 bg-tata-blue text-white text-sm font-bold rounded-lg hover:bg-tata-dark shadow-md transition-all flex items-center justify-center gap-2 min-w-[180px] disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Final Save Record</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
