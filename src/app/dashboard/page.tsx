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
import * as XLSX from 'xlsx-js-style';

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

            // MODULE Conditional Logic
            if (field === 'Enter Module') {
                if (val === 'Yes') {
                    next['Enter Module Name'] = ''; // Clear for user to type
                } else if (val === 'No') {
                    next['Enter Module Name'] = 'Not Applicable / OK'; // Auto-fill
                }
            }

            // FUNCTIONAL CLASS Conditional Logic
            if (field === 'Functional Class Applicability') {
                if (val === 'Yes') {
                    next['Functional Class  (As per COS model Properties)'] = ''; // Clear for user to type
                } else if (val === 'No') {
                    next['Functional Class  (As per COS model Properties)'] = 'NA'; // Auto-fill
                }
            }

            // MFG CODE Conditional Logic
            if (field === 'Mfg Code Applicability') {
                if (val === 'Yes') {
                    next['Mfg Code ST10804   (As per COS model Properties)'] = ''; // Clear for user to type
                } else if (val === 'No') {
                    next['Mfg Code ST10804   (As per COS model Properties)'] = 'NA'; // Auto-fill
                }
            }

            // PROCESS CODE Conditional Logic
            if (field === 'Process Code Applicability') {
                if (val === 'Yes') {
                    next['Process Code   (As per COS model Properties)'] = ''; // Clear for user to type
                } else if (val === 'No') {
                    next['Process Code   (As per COS model Properties)'] = 'NA'; // Auto-fill
                }
            }

            // HOLES Conditional Logic
            if (field === 'Total No. of holes') {
                const allHoleInputs = ['Total No. of Finish Holes', 'Total No. of Pilot/Pre-drilled Holes', 'Total No. of Coordination/Tooling Holes'];
                allHoleInputs.forEach(h => {
                    next[h] = 'NA';
                });
                if (val === 'Finish Holes') next['Total No. of Finish Holes'] = '';
                if (val === 'Pilot/Pre-drilled Holes') next['Total No. of Pilot/Pre-drilled Holes'] = '';
                if (val === 'Coordination/Tooling Holes') next['Total No. of Coordination/Tooling Holes'] = '';
            }

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
            const rmFields = [
                'RM RAS Code', 'SAP RM MM Code', 'RM material Type', 'RM Input Type',
                'Alloy', 'Material Spec Mentioned', 'Initial Temper', 'Final Temper',
                'Sheet Thk (mm)', 'RM Sheet Length (mm)', 'RM Sheet Width (mm)',
                'Heat Treatment Applicability', 'RM Remark', 'Unit'
            ];

            if (rmFields.includes(field)) {
                let thkNum = parseFloat(next['Sheet Thk (mm)']) || 0;
                let lenNum = parseFloat(next['RM Sheet Length (mm)']) || 0;
                let widNum = parseFloat(next['RM Sheet Width (mm)']) || 0;

                if (next['Unit'] === 'Inch') {
                    thkNum = Number((thkNum * 25.4).toFixed(3));
                    lenNum = Number((lenNum * 25.4).toFixed(3));
                    widNum = Number((widNum * 25.4).toFixed(3));
                }

                const partsToJoin = [
                    next['RM RAS Code'],
                    next['SAP RM MM Code'],
                    next['RM material Type'],
                    next['RM Input Type'],
                    next['Alloy'],
                    next['Material Spec Mentioned'],
                    next['Initial Temper'],
                    next['Final Temper'],
                    next['Sheet Thk (mm)'] ? `${thkNum}mm(Thk)` : '',
                    next['RM Sheet Width (mm)'] ? `${widNum}mm(W)` : '',
                    next['RM Sheet Length (mm)'] ? `${lenNum}mm(L)` : '',
                    next['Heat Treatment Applicability'],
                    next['RM Remark']
                ].filter(Boolean);

                next['Material with Concatenate'] = partsToJoin.join(' / ');
            }

            // BASE MATRIX SCORING LOGIC
            const BASE_MATRIX_WEIGHTS: Record<string, number> = {
                "Nos of Bends": 0.10,
                "Type of Part (Flat , Formed)": 0.05,
                "Type of Forming (Hot forming, Cold Forming)": 0.15,
                "Forming Temper condition (F,H11,O,T,T42,AQ/W)": 0.10,
                "Type of Bend (Concave, convex, straight)": 0.15,
                "Joggle (Joggle Depth , Nos of Joggle , Joggle ratio)": 0.10,
                "Thickness Mill (Chemical Mill , Mechanical Mill , Nos of Pockets)": 0.10,
                "Type of Raw material": 0.10,
                "Part Thickness (min, mm)": 0.05,
                "GD&T — Hole Position": 0.05,
                "GD&T — Form & Profile Controls": 0.05
            };
            const BASE_MATRIX_SCORE_KEYS: Record<string, string> = {
                "Nos of Bends": "Nos of Bends Score",
                "Type of Part (Flat , Formed)": "Type of Part Score",
                "Type of Forming (Hot forming, Cold Forming)": "Type of Forming Score",
                "Forming Temper condition (F,H11,O,T,T42,AQ/W)": "Forming Temper condition Score",
                "Type of Bend (Concave, convex, straight)": "Type of Bend Score",
                "Joggle (Joggle Depth , Nos of Joggle , Joggle ratio)": "Joggle Score",
                "Thickness Mill (Chemical Mill , Mechanical Mill , Nos of Pockets)": "Thickness Mill Score",
                "Type of Raw material": "Type of Raw material Score",
                "Part Thickness (min, mm)": "Part Thickness Score",
                "GD&T — Hole Position": "GD&T Hole Position Score",
                "GD&T — Form & Profile Controls": "GD&T Form & Profile Controls Score"
            };

            if (field === 'Base Matrix Applicability') {
                if (val === 'No') {
                    // Ensure we clear out old criteria keys if No
                    for (const k of Object.keys(BASE_MATRIX_WEIGHTS)) {
                        next[k] = 'NA';
                        next[BASE_MATRIX_SCORE_KEYS[k]] = 'NA';
                        next[`${k} Criteria Weight`] = 'NA';
                        next[`${k} Weighted Score`] = 'NA';
                    }
                    next['Base Matrix Total Score'] = 'NA';
                    next['Family Name'] = 'NA';
                    next['Feature Score'] = 'NA';
                    next['Part Family Code'] = 'NA';
                } else if (val === 'Yes') {
                    for (const k of Object.keys(BASE_MATRIX_WEIGHTS)) {
                        if (next[k] === 'NA') next[k] = '';
                        if (next[BASE_MATRIX_SCORE_KEYS[k]] === 'NA') next[BASE_MATRIX_SCORE_KEYS[k]] = '';
                        next[`${k} Criteria Weight`] = `${BASE_MATRIX_WEIGHTS[k] * 100}%`;
                        if (next[`${k} Weighted Score`] === 'NA') next[`${k} Weighted Score`] = '';
                    }
                    next['Base Matrix Total Score'] = '';
                    if (next['Family Name'] === 'NA') next['Family Name'] = '';
                    if (next['Feature Score'] === 'NA') next['Feature Score'] = '';
                    if (next['Part Family Code'] === 'NA') next['Part Family Code'] = '';
                }
            }

            const baseMatrixKeys = Object.keys(BASE_MATRIX_WEIGHTS);
            if (baseMatrixKeys.includes(field)) {
                let totalScore = 0;
                let isValid = false;
                for (const key of baseMatrixKeys) {
                    const mappedVal = next[key];
                    if (next['Base Matrix Applicability'] === 'Yes') {
                        next[`${key} Criteria Weight`] = `${BASE_MATRIX_WEIGHTS[key] * 100}%`;
                    }
                    if (mappedVal && DROPDOWN_OPTIONS[key]) {
                        const score = DROPDOWN_OPTIONS[key].indexOf(mappedVal) + 1;
                        if (score > 0) {
                            const weighted = score * BASE_MATRIX_WEIGHTS[key];
                            next[BASE_MATRIX_SCORE_KEYS[key]] = score.toString();
                            next[`${key} Weighted Score`] = weighted.toFixed(2);
                            totalScore += weighted;
                            isValid = true;
                        } else {
                            next[BASE_MATRIX_SCORE_KEYS[key]] = '';
                            next[`${key} Weighted Score`] = '';
                        }
                    }
                }
                if (isValid) {
                    next['Base Matrix Total Score'] = totalScore.toFixed(3);
                    // AUTO Feature Score from total matrix score
                    const fs = Math.min(5, Math.max(1, Math.round(totalScore)));
                    next['Feature Score'] = fs.toString();
                }
            }

            // Recalculate family code when any relevant field changes
            const familyTriggers = ['Family Name', 'RM material Type', 'RM Input Type', 'Finish part Length (mm)', 'Finish part width (mm)', 'RM Sheet Length (mm)', 'RM Sheet Width (mm)', 'Unit', 'Feature Score'];
            if (familyTriggers.includes(field) || Object.keys(BASE_MATRIX_WEIGHTS).includes(field)) {
                const type = next['Family Name']?.split(' - ')[0] || '';
                const mat = next['RM material Type']?.split(' - ')[0] || '';
                const form = next['RM Input Type']?.split(' - ')[0] || '';

                // Auto Size from dimensions
                const lengthVal = parseFloat(next['Finish part Length (mm)']) || parseFloat(next['RM Sheet Length (mm)']) || 0;
                const widthVal = parseFloat(next['Finish part width (mm)']) || parseFloat(next['RM Sheet Width (mm)']) || 0;
                let maxDim = Math.max(lengthVal, widthVal);
                if (next['Unit'] === 'Inch') maxDim *= 25.4;

                let size = '';
                if (maxDim > 1800) size = 'XL';
                else if (maxDim >= 800) size = 'L';
                else if (maxDim >= 300) size = 'M';
                else if (maxDim >= 100) size = 'S';
                else if (maxDim > 0) size = 'XS';
                if (size) next['Size (Auto)'] = size;

                const fsNum = next['Feature Score'] || '';

                const parts = [type, mat, form, size, fsNum].filter(Boolean);
                next["Part Family Code"] = parts.length > 0 ? parts.join(' - ') : '';
            }

            return next;
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Substitute custom values into main fields
        const finalData = { ...formData };
        for (const [key, val] of Object.entries(finalData)) {
            if (['If any', 'If Any', 'Any other', 'Any Other'].includes(val as string)) {
                if (finalData[`${key}_custom`]) {
                    finalData[key] = finalData[`${key}_custom`];
                }
            }
            // Cleanup custom fields from payload
            if (key.endsWith('_custom')) {
                delete finalData[key];
            }
        }

        // Block empty submissions
        const hasValues = Object.values(finalData).some(val => val && (val as string).trim() !== '');
        if (!hasValues) {
            toast.error('Blank entry not allowed. Please fill out the form.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/pfm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });

            const json = await res.json();

            if (res.ok) {
                setData([...data, json.data]);
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

        const row0: any[] = [];
        const row1: any[] = [];
        const row2: any[] = [];
        const merges: XLSX.Range[] = [];

        let col0 = 0;
        SUPER_HEADERS.forEach(sh => {
            const cell = {
                v: sh.name,
                t: 's',
                s: {
                    font: { bold: true, color: { rgb: "000000" }, sz: 12 },
                    fill: { fgColor: { rgb: sh.color || "DDEBF7" } },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
                }
            };
            row0.push(cell);
            for (let i = 1; i < sh.colSpan; i++) row0.push({ v: '', s: cell.s });
            if (sh.colSpan > 1) {
                merges.push({ s: { r: 0, c: col0 }, e: { r: 0, c: col0 + sh.colSpan - 1 } });
            }
            col0 += sh.colSpan;
        });

        let col1 = 0;
        SUB_HEADERS.forEach(sh => {
            const cell = {
                v: sh.name,
                t: 's',
                s: {
                    font: { bold: true, color: { rgb: "000000" }, sz: 11 },
                    fill: { fgColor: { rgb: sh.color || "E2EFDA" } },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
                }
            };
            row1.push(cell);
            for (let i = 1; i < sh.colSpan; i++) row1.push({ v: '', s: cell.s });
            if (sh.colSpan > 1) {
                merges.push({ s: { r: 1, c: col1 }, e: { r: 1, c: col1 + sh.colSpan - 1 } });
            }
            col1 += sh.colSpan;
        });

        PFM_HEADERS.forEach((header, index) => {
            let matchedColor = "FFFFFF";
            let cSpanFound = 0;
            for (let j = 0; j < SUB_HEADERS.length; j++) {
                cSpanFound += SUB_HEADERS[j].colSpan;
                if (index < cSpanFound) {
                    matchedColor = SUB_HEADERS[j].color || "FFFFFF";
                    break;
                }
            }

            const cell = {
                v: header,
                t: 's',
                s: {
                    font: { bold: true, sz: 10 },
                    fill: { fgColor: { rgb: matchedColor } },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
                }
            };
            row2.push(cell);
        });

        const dataRows = data.map((item: any, idx) => {
            const rowArr: any[] = [];
            PFM_HEADERS.forEach((header, index) => {
                let cellVal = '';
                if (header.includes('SR') && header.includes('NO')) {
                    cellVal = (idx + 1).toString();
                } else {
                    cellVal = item.data?.[header] || '';
                }

                let matchedColor = "FFFFFF";
                let cSpanFound = 0;
                for (let j = 0; j < SUB_HEADERS.length; j++) {
                    cSpanFound += SUB_HEADERS[j].colSpan;
                    if (index < cSpanFound) {
                        matchedColor = SUB_HEADERS[j].color || "FFFFFF";
                        break;
                    }
                }

                rowArr.push({
                    v: cellVal,
                    t: 's',
                    s: {
                        fill: { fgColor: { rgb: matchedColor } },
                        alignment: { horizontal: "center", vertical: "center", wrapText: true },
                        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
                    }
                });
            });
            return rowArr;
        });

        const finalAoa = [row0, row1, row2, ...dataRows];
        const worksheet = XLSX.utils.aoa_to_sheet(finalAoa);

        const wscols = PFM_HEADERS.map(() => ({ wch: 22 }));
        worksheet['!cols'] = wscols;
        worksheet['!merges'] = merges;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "PFM_R00");
        XLSX.writeFile(workbook, "Engineering_PFM_Export.xlsx");
        toast.success('Export downloaded successfully!');
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-tata-blue w-8 h-8" /></div>;

    const currentIdx = groupKeys.indexOf(activeTab);
    const isFirstTab = currentIdx === 0;
    const isLastTab = currentIdx === groupKeys.length - 1;
    const progressPercent = ((currentIdx + 1) / groupKeys.length) * 100;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Navbar user={user} />

            <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 border-l-4 border-l-tata-blue shadow-sm border-y border-r border-gray-200 mb-6">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="p-2 bg-tata-light rounded-sm">
                            <Settings2 className="w-5 h-5 text-tata-dark" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-tata-dark uppercase tracking-tight">Engineering PFM</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 tracking-wide">ENTERPRISE MANUFACTURING DATA MANAGEMENT</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => { setShowModal(true); setActiveTab(groupKeys[0]); }}
                            className="flex-1 sm:flex-none bg-tata-blue text-white px-5 py-2.5 hover:bg-tata-dark transition-colors duration-200 flex items-center justify-center gap-2 font-bold shadow-sm uppercase text-xs tracking-wider rounded-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Record
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex-1 sm:flex-none bg-tata-dark text-white px-5 py-2.5 hover:opacity-90 transition-colors duration-200 flex items-center justify-center gap-2 font-bold shadow-sm uppercase text-xs tracking-wider rounded-sm"
                        >
                            <Download className="w-4 h-4" /> Export DB
                        </button>
                    </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-300 flex-1 flex flex-col overflow-hidden relative">
                    {data.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mb-6 border border-gray-200 shadow-sm">
                                <Maximize2 className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 mb-2 uppercase tracking-wide">No Records Found</h3>
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
                <div className="fixed inset-0 z-[100] bg-gray-900/80 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden transition-all duration-200">
                    <div className="bg-white shadow-2xl border border-gray-300 w-full max-w-[1400px] h-auto max-h-[92vh] flex flex-col xl:flex-row relative overflow-hidden rounded-sm">

                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-100 xl:hidden">
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-tata-dark uppercase flex items-center gap-3 tracking-wide">
                                    Engineering Configuration
                                    <span className="text-[10px] font-bold px-2 py-1 bg-tata-blue text-white shadow-sm rounded-sm uppercase tracking-widest">
                                        Step {currentIdx + 1}/{groupKeys.length}
                                    </span>
                                </h2>
                                <div className="mt-3 w-full bg-gray-300 h-1">
                                    <div className="bg-tata-blue h-1 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-600 transition-colors ml-4 self-start rounded-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                            <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">
                                {/* Sidebar Navigation */}
                                <div className="w-full xl:w-72 bg-gray-50 border-r border-gray-300 overflow-y-auto hidden md:block custom-scrollbar">
                                    <div className="px-6 py-6 border-b border-gray-300 hidden xl:block bg-gray-100">
                                        <h2 className="text-lg font-bold text-tata-dark mb-4 uppercase tracking-wide">PFM Setup</h2>
                                        <div className="w-full bg-gray-300 h-1.5 shadow-inner">
                                            <div className="bg-tata-accent h-1.5 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                                        </div>
                                    </div>
                                    <ul className="p-0">
                                        {groupKeys.map((group, idx) => (
                                            <li key={group} className="border-b border-gray-200 last:border-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab(group)}
                                                    className={`w-full flex items-center justify-between px-6 py-4 text-xs tracking-wide font-bold uppercase transition-all duration-200 rounded-none ${activeTab === group
                                                        ? 'bg-tata-blue border-l-4 border-tata-dark text-white'
                                                        : idx < currentIdx
                                                            ? 'text-tata-blue bg-white hover:bg-gray-100'
                                                            : 'text-gray-500 hover:bg-gray-200/50 hover:text-tata-dark'
                                                        }`}
                                                >
                                                    {group}
                                                    {idx < currentIdx && activeTab !== group && <CheckCircle2 className={`w-4 h-4 ${activeTab === group ? 'text-white' : 'text-emerald-600'}`} />}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Form Fields Area */}
                                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                                    <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 custom-scrollbar">
                                        <div className="sm:hidden flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-gray-200 custom-scrollbar">
                                            {groupKeys.map(group => (
                                                <button
                                                    key={group}
                                                    type="button"
                                                    onClick={() => setActiveTab(group)}
                                                    className={`whitespace-nowrap px-4 py-2 text-xs font-bold uppercase transition-all border ${activeTab === group ? 'bg-tata-blue text-white border-tata-blue' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-200 rounded-sm'}`}
                                                >
                                                    {group}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mb-2 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center border-b-2 border-tata-dark/10 pb-4 mb-8">
                                                <h3 className="text-xl font-bold uppercase tracking-wider text-tata-dark">{activeTab === 'General Info' ? 'General Configuration' : `${activeTab} Data`}</h3>
                                                <button
                                                    onClick={() => setShowModal(false)}
                                                    className="w-10 h-10 bg-white border border-gray-300 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-600 transition-all shadow-sm hidden xl:flex hover:border-red-600 rounded-sm"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-7">
                                                {FIELD_GROUPS[activeTab]?.map((h, i) => {
                                                    // Conditionally hide Enter Module Name if Enter Module is not Yes
                                                    if (h === 'Enter Module Name' && formData['Enter Module'] !== 'Yes') return null;

                                                    // Conditionally hide Total No. of holes inputs
                                                    if (h === 'Total No. of Finish Holes' && formData['Total No. of holes'] !== 'Finish Holes') return null;
                                                    if (h === 'Total No. of Pilot/Pre-drilled Holes' && formData['Total No. of holes'] !== 'Pilot/Pre-drilled Holes') return null;
                                                    if (h === 'Total No. of Coordination/Tooling Holes' && formData['Total No. of holes'] !== 'Coordination/Tooling Holes') return null;

                                                    // Conditionally hide Base Matrix items if Applicability is not Yes
                                                    const baseMatrixFields = [
                                                        "Feature Score",
                                                        "Family Name",
                                                        "Part Family Code",
                                                        "Nos of Bends",
                                                        "Type of Part (Flat , Formed)",
                                                        "Type of Forming (Hot forming, Cold Forming)",
                                                        "Forming Temper condition (F,H11,O,T,T42,AQ/W)",
                                                        "Type of Bend (Concave, convex, straight)",
                                                        "Joggle (Joggle Depth , Nos of Joggle , Joggle ratio)",
                                                        "Thickness Mill (Chemical Mill , Mechanical Mill , Nos of Pockets)",
                                                        "Type of Raw material",
                                                        "Part Thickness (min, mm)",
                                                        "GD&T — Hole Position",
                                                        "GD&T — Form & Profile Controls",
                                                        "Base Matrix Total Score"
                                                    ];
                                                    if (baseMatrixFields.includes(h) && formData['Base Matrix Applicability'] !== 'Yes') return null;

                                                    const renderLabel = (headerName: string) => {
                                                        let label = headerName;
                                                        const unit = formData['Unit'] || 'mm';
                                                        if (label.includes('(mm)')) label = label.replace(/\(mm\)/g, `(${unit.toLowerCase()})`);
                                                        if (label.includes('(MM)')) label = label.replace(/\(MM\)/g, `(${unit.toUpperCase()})`);
                                                        if (label.includes('(min, mm)')) label = label.replace(/\(min, mm\)/g, `(min, ${unit.toLowerCase()})`);
                                                        return label;
                                                    };
                                                    const displayLabel = renderLabel(h);

                                                    return (
                                                        <div key={i} className="flex flex-col group">
                                                            <label className="text-xs font-bold text-tata-dark mb-1.5 uppercase tracking-wide truncate" title={displayLabel}>{displayLabel}</label>
                                                            {DROPDOWN_OPTIONS[h] ? (
                                                                <div className="relative group/select">
                                                                    <select
                                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:border-tata-blue focus:ring-1 focus:ring-tata-blue text-sm bg-white hover:border-gray-400 appearance-none shadow-sm transition-all cursor-pointer font-medium text-gray-800"
                                                                        value={formData[h] || ''}
                                                                        onChange={(e) => handleInputChange(h, e.target.value)}
                                                                    >
                                                                        <option value="" disabled className="text-gray-400">Select {displayLabel.toLowerCase()}</option>
                                                                        {DROPDOWN_OPTIONS[h].map((opt, idx) => (
                                                                            <option key={idx} value={opt}>{opt}</option>
                                                                        ))}
                                                                        {formData[h] && !DROPDOWN_OPTIONS[h].includes(formData[h]) && (
                                                                            <option value={formData[h]} className="text-tata-blue font-bold italic">{formData[h]} (Auto)</option>
                                                                        )}
                                                                    </select>
                                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 group-hover/select:text-tata-blue transition-colors">
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
                                                                    placeholder={h === 'Feature Score' ? 'Auto-calculated from matrix score...' : h === 'Part Family Code' ? 'Auto-generated...' : `Enter ${displayLabel.toLowerCase()}...`}
                                                                    className={`w-full px-4 py-2.5 border rounded-sm focus:outline-none text-sm shadow-sm transition-all font-medium ${h === 'Base Matrix Total Score' || h === 'Feature Score' || h === 'Part Family Code'
                                                                        ? 'bg-amber-50 cursor-not-allowed font-extrabold text-tata-dark border-amber-300'
                                                                        : 'bg-white border-gray-300 hover:border-gray-400 text-gray-800 focus:border-tata-blue focus:ring-1 focus:ring-tata-blue'
                                                                        }`}
                                                                    value={formData[h] || ''}
                                                                    onChange={(e) => handleInputChange(h, e.target.value)}
                                                                    disabled={h === 'Base Matrix Total Score' || h === 'Feature Score' || h === 'Part Family Code'}
                                                                />
                                                            )}
                                                            {['If any', 'If Any', 'Any other', 'Any Other'].includes(formData[h]) && (
                                                                <input
                                                                    type="text"
                                                                    placeholder={`Please specify...`}
                                                                    className="mt-2 w-full px-4 py-2.5 border border-tata-accent rounded-sm focus:outline-none focus:border-tata-blue focus:ring-1 focus:ring-tata-blue text-sm shadow-sm transition-all font-bold text-tata-dark bg-blue-50"
                                                                    value={formData[`${h}_custom`] || ''}
                                                                    onChange={(e) => handleInputChange(`${h}_custom`, e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {activeTab === 'Base Matrix Sheet' && formData['Base Matrix Applicability'] === 'Yes' && (
                                                <div className="mt-8 mb-2 p-6 bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-tata-blue/20 rounded-sm shadow-inner">
                                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 text-center">Part Family Code</h3>
                                                    {/* Colored segment display like PPT */}
                                                    <div className="flex items-center justify-center flex-wrap gap-0">
                                                        {[
                                                            { label: 'PART TYPE', value: formData['Family Name']?.split(' - ')[0] || '?', color: '#2563EB', bg: '#DBEAFE' },
                                                            { label: 'MATERIAL', value: formData['RM material Type']?.split(' - ')[0] || formData['RM material Type'] || '?', color: '#16A34A', bg: '#DCFCE7' },
                                                            { label: 'FORM', value: formData['RM Input Type']?.split(' - ')[0] || '?', color: '#DC2626', bg: '#FEE2E2' },
                                                            { label: 'SIZE', value: (() => { const l = parseFloat(formData['Finish part Length (mm)']) || parseFloat(formData['RM Sheet Length (mm)']) || 0; const w = parseFloat(formData['Finish part width (mm)']) || parseFloat(formData['RM Sheet Width (mm)']) || 0; let m = Math.max(l, w); if (formData['Unit'] === 'Inch') m *= 25.4; if (m > 1800) return 'XL'; if (m >= 800) return 'L'; if (m >= 300) return 'M'; if (m >= 100) return 'S'; if (m > 0) return 'XS'; return '?'; })(), color: '#7C3AED', bg: '#EDE9FE' },
                                                            { label: 'FEATURE SCORE', value: formData['Feature Score'] || '?', color: '#D97706', bg: '#FEF3C7' },
                                                        ].map((seg, i, arr) => (
                                                            <div key={i} className="flex items-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[9px] font-black tracking-widest mb-1" style={{ color: seg.color }}>{seg.label}</span>
                                                                    <div className="px-5 py-3 text-2xl font-black tracking-wider rounded-sm shadow-sm" style={{ backgroundColor: seg.bg, color: seg.color, minWidth: 60, textAlign: 'center' }}>
                                                                        {seg.value}
                                                                    </div>
                                                                </div>
                                                                {i < arr.length - 1 && (
                                                                    <span className="text-3xl font-black text-gray-400 mx-2 mt-4">—</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {formData['Part Family Code'] && (
                                                        <p className="text-center text-xs text-gray-400 mt-4 tracking-widest uppercase font-semibold">
                                                            Full Code: <span className="text-tata-blue font-black">{formData['Part Family Code']}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Wizard Footer */}
                            <div className="p-5 border-t border-gray-200 bg-gray-100 flex justify-between items-center rounded-b-sm">
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-sm transition-colors border border-transparent">
                                        Cancel Process
                                    </button>
                                </div>

                                <div className="flex gap-3 items-center">
                                    {!isFirstTab && (
                                        <button
                                            type="button"
                                            onClick={handlePrev}
                                            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-gray-50 shadow-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </button>
                                    )}

                                    {!isLastTab ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="px-8 py-2.5 bg-tata-accent text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:opacity-90 shadow-sm transition-all flex items-center justify-center gap-2 min-w-[140px]"
                                        >
                                            Save & Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-8 py-2.5 bg-tata-dark text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:opacity-90 shadow-sm transition-all flex items-center justify-center gap-2 min-w-[180px] disabled:opacity-70 disabled:cursor-not-allowed"
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
