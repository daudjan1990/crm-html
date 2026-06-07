// projectAssistant.js - Beginner-friendly project checklist guidance

class ProjectAssistantManager {
    constructor() {
        this.summaryEl = null;
        this.phasesEl = null;
        this.storageKey = 'project_assistant_checklist';
        this.checkedItems = {};
        this.phases = this.getDefaultPhases();
        this.initialize();
    }

    initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.summaryEl = document.getElementById('project-assistant-summary');
        this.phasesEl = document.getElementById('project-assistant-phases');

        if (!this.summaryEl || !this.phasesEl) {
            return;
        }

        this.loadState();
        this.renderAssistant();

        this.phasesEl.addEventListener('change', (event) => {
            const checkbox = event.target;
            if (!checkbox.classList.contains('project-assistant-checkbox')) {
                return;
            }

            const itemId = checkbox.dataset.itemId;
            if (!itemId) {
                return;
            }

            this.checkedItems[itemId] = checkbox.checked;
            this.saveState();
            this.renderAssistant();
        });

        const resetBtn = document.getElementById('project-assistant-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all project assistant checklist items?')) {
                    this.checkedItems = {};
                    this.saveState();
                    this.renderAssistant();
                }
            });
        }
    }

    getDefaultPhases() {
        return [
            {
                title: '1) Initialization',
                description: 'Clarify why the project exists and who is involved.',
                items: [
                    'Write the project goal in one sentence',
                    'Define scope: what is included and excluded',
                    'List stakeholders and contact persons',
                    'Set project success criteria'
                ]
            },
            {
                title: '2) Planning',
                description: 'Create a realistic delivery roadmap.',
                items: [
                    'Break work into milestones',
                    'Estimate effort and deadlines for each milestone',
                    'Assign responsibilities to owners',
                    'List top project risks and mitigations'
                ]
            },
            {
                title: '3) Execution',
                description: 'Track progress and keep communication active.',
                items: [
                    'Hold regular status check-ins',
                    'Track completed, active, and blocked tasks',
                    'Update timeline when priorities change',
                    'Document key decisions and changes'
                ]
            },
            {
                title: '4) Monitoring & Control',
                description: 'Keep quality, budget, and timeline under control.',
                items: [
                    'Review milestone quality before approval',
                    'Compare actual progress against the plan',
                    'Escalate blockers early',
                    'Communicate updates to stakeholders'
                ]
            },
            {
                title: '5) Closing',
                description: 'Finish cleanly and preserve lessons learned.',
                items: [
                    'Confirm all deliverables are accepted',
                    'Run final retrospective: what worked and what did not',
                    'Archive project files and documentation',
                    'Celebrate completion with the team'
                ]
            }
        ];
    }

    loadState() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.checkedItems = JSON.parse(stored) || {};
            }
        } catch (error) {
            console.error('Error loading project assistant state:', error);
            this.checkedItems = {};
        }
    }

    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.checkedItems));
        } catch (error) {
            console.error('Error saving project assistant state:', error);
        }
    }

    renderAssistant() {
        if (!this.summaryEl || !this.phasesEl) {
            return;
        }

        const allItems = this.phases.flatMap((phase, phaseIndex) =>
            phase.items.map((item, itemIndex) => ({
                id: this.getItemId(phaseIndex, itemIndex),
                label: item
            }))
        );

        const completedCount = allItems.filter(item => this.checkedItems[item.id]).length;
        const totalCount = allItems.length;
        const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        this.summaryEl.innerHTML = `
            <div class="project-assistant-progress">
                <div class="project-assistant-progress-text">
                    <strong>Progress:</strong> ${completedCount}/${totalCount} steps completed (${percent}%)
                </div>
                <div class="project-assistant-progress-bar">
                    <div class="project-assistant-progress-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;

        this.phasesEl.innerHTML = this.phases.map((phase, phaseIndex) => {
            const phaseItems = phase.items.map((item, itemIndex) => {
                const itemId = this.getItemId(phaseIndex, itemIndex);
                const checked = !!this.checkedItems[itemId];

                return `
                    <label class="project-assistant-item">
                        <input
                            type="checkbox"
                            class="project-assistant-checkbox"
                            data-item-id="${itemId}"
                            ${checked ? 'checked' : ''}>
                        <span>${this.escapeHtml(item)}</span>
                    </label>
                `;
            }).join('');

            return `
                <article class="project-assistant-phase">
                    <h3>${this.escapeHtml(phase.title)}</h3>
                    <p>${this.escapeHtml(phase.description)}</p>
                    <div class="project-assistant-items">
                        ${phaseItems}
                    </div>
                </article>
            `;
        }).join('');
    }

    getItemId(phaseIndex, itemIndex) {
        return `phase-${phaseIndex}-item-${itemIndex}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const projectAssistantManager = new ProjectAssistantManager();
window.projectAssistantManager = projectAssistantManager;
