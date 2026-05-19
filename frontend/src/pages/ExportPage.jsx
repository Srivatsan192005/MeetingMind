import React, { useMemo, useState } from 'react';
import { Share, Copy, Download as DownloadIcon, FileText, ListTodo, BadgeCheck } from 'lucide-react';
import './ExportPage.css';

const EXPORT_PRESETS = [
    { id: 'full', label: 'Full meeting' },
    { id: 'summary', label: 'Summary only' },
    { id: 'actions', label: 'Action items' },
    { id: 'decisions', label: 'Decisions' },
];

function buildMarkdown(meeting, preset = 'full') {
    const r = meeting.result;
    const title = meeting.title || 'Meeting';
    const summaryText = typeof r.summary === 'string'
        ? r.summary
        : r.summary?.overview || '';
    const actionItems = (r.action_items || []).map((item) => ({
        description: item.description || item.task || '',
        assignee: item.assignee || item.owner || null,
        deadline: item.deadline || null,
    }));
    const decisions = (r.decisions && r.decisions.length > 0)
        ? r.decisions
        : (r.summary?.key_decisions || []);

    let md = `# ${title}\n\n`;

    if (preset === 'summary') {
        return `${md}## Summary\n${summaryText}\n`;
    }

    if (preset === 'actions') {
        md += `## Action Items\n`;
        actionItems.forEach(a => {
            md += `- [ ] **${a.description}**`;
            if (a.assignee) md += ` — *${a.assignee}*`;
            if (a.deadline) md += ` (due: ${a.deadline})`;
            md += '\n';
        });
        return md;
    }

    if (preset === 'decisions') {
        md += `## Decisions\n`;
        decisions.forEach(d => { md += `- ${d}\n`; });
        return md;
    }

    md += `## Summary\n${summaryText}\n\n`;
    md += `## Action Items\n`;
    actionItems.forEach(a => {
        md += `- [ ] **${a.description}**`;
        if (a.assignee) md += ` — *${a.assignee}*`;
        if (a.deadline) md += ` (due: ${a.deadline})`;
        md += '\n';
    });
    md += `\n## Decisions\n`;
    decisions.forEach(d => { md += `- ${d}\n`; });
    return md;
}

export default function ExportPage({ meeting }) {
    const [preset, setPreset] = useState('full');
    const md = useMemo(() => meeting ? buildMarkdown(meeting, preset) : '', [meeting, preset]);

    if (!meeting) {
        return (
            <div className="empty-state" style={{ flex: 1 }}>
                <div className="empty-icon">
                    <Share size={48} strokeWidth={1.5} />
                </div>
                <h3>No meeting to export</h3>
                <p>Run an analysis first so the export panel can generate markdown and JSON output.</p>
            </div>
        );
    }

    const json = JSON.stringify(meeting.result, null, 2);
    const title = meeting.title || 'meeting';

    const download = (content, filename, type) => {
        const blob = new Blob([content], { type });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    };

    return (
        <div className="export-page">
            <div className="export-header">
                <h2>Export</h2>
                <p>Download or copy the meeting results</p>
            </div>

            <div className="export-presets">
                {EXPORT_PRESETS.map(item => {
                    const Icon = item.id === 'summary' ? FileText : item.id === 'actions' ? ListTodo : item.id === 'decisions' ? BadgeCheck : DownloadIcon;
                    return (
                        <button
                            key={item.id}
                            className={`preset-btn ${preset === item.id ? 'active' : ''}`}
                            onClick={() => setPreset(item.id)}
                        >
                            <Icon size={16} />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div className="export-section">
                <div className="export-section-header">
                    <h3>Markdown preview</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(md)}>
                            <Copy size={16} /> Copy
                        </button>
                        <button className="btn-secondary" onClick={() => download(md, `${title.replace(/\s+/g, '_')}_${preset}.md`, 'text/markdown')}>
                            <DownloadIcon size={16} /> Download .md
                        </button>
                    </div>
                </div>
                <pre className="export-preview">{md}</pre>
            </div>

            <div className="export-section">
                <div className="export-section-header">
                    <h3>JSON</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(json)}>
                            <Copy size={16} /> Copy
                        </button>
                        <button className="btn-secondary" onClick={() => download(json, (meeting.title || 'meeting').replace(/\s+/g, '_') + '.json', 'application/json')}>
                            <DownloadIcon size={16} /> Download .json
                        </button>
                    </div>
                </div>
                <pre className="export-preview">{json}</pre>
            </div>
        </div>
    );
}