import React from 'react';
import { Share, Copy, Download as DownloadIcon } from 'lucide-react';
import './ExportPage.css';

function buildMarkdown(meeting) {
    const r = meeting.result;
    let md = `# ${meeting.title}\n\n## Summary\n${r.summary}\n\n`;
    md += `## Action Items\n`;
    (r.action_items || []).forEach(a => {
        md += `- [ ] **${a.description}**`;
        if (a.assignee) md += ` — *${a.assignee}*`;
        if (a.deadline) md += ` (due: ${a.deadline})`;
        md += '\n';
    });
    md += `\n## Decisions\n`;
    (r.decisions || []).forEach(d => { md += `- ${d}\n`; });
    return md;
}

export default function ExportPage({ meeting }) {
    if (!meeting) {
        return (
            <div className="empty-state" style={{ flex: 1 }}>
                <div className="empty-icon">
                    <Share size={48} strokeWidth={1.5} />
                </div>
                <h3>No meeting to export</h3>
                <p>Process a meeting first.</p>
            </div>
        );
    }

    const md = buildMarkdown(meeting);
    const json = JSON.stringify(meeting.result, null, 2);

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

            <div className="export-section">
                <div className="export-section-header">
                    <h3>Markdown</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(md)}>
                            <Copy size={16} /> Copy
                        </button>
                        <button className="btn-secondary" onClick={() => download(md, meeting.title.replace(/\s+/g, '_') + '.md', 'text/markdown')}>
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
                        <button className="btn-secondary" onClick={() => download(json, meeting.title.replace(/\s+/g, '_') + '.json', 'application/json')}>
                            <DownloadIcon size={16} /> Download .json
                        </button>
                    </div>
                </div>
                <pre className="export-preview">{json}</pre>
            </div>
        </div>
    );
}