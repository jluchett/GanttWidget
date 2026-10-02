class FleetGanttViewer {
    constructor(config) {
        this.containerId = config.containerId;
        this.container = document.getElementById(this.containerId);
        this.rawSchedule = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        this.zoomHours = config.defaultZoomHours || 2;
        this.hourWidth = this.calculateHourWidth(this.zoomHours);
        this.filterType = 'ALL';
        this.filterStatus = 'ALL';
        this.filterText = '';
        this.onlyConflicts = false;

        this.normalizeTasks();
        this.initDOM();
        this.populateDynamicFilters();
        this.detectClientConflicts();
        this.computeTimelineBounds();
        this.bindGlobalLegend();
        this.render();
    }

    calculateHourWidth(zoomHours) {
        switch (zoomHours) {
            case 1: return 80;
            case 2: return 50;
            case 4: return 32;
            case 24: return 14;
            default: return 50;
        }
    }

    normalizeTasks() {
        if (!this.rawSchedule || !Array.isArray(this.rawSchedule.tasks)) {
            this.rawSchedule = { resources: [], tasks: [] };
            return;
        }
        if (!Array.isArray(this.rawSchedule.resources)) {
            this.rawSchedule.resources = [];
        }

        this.rawSchedule.tasks.forEach(t => {
            if (!Array.isArray(t.resourceIds)) {
                t.resourceIds = [];
                const d = t.details || {};
                if (t.resourceId) t.resourceIds.push(t.resourceId);
                if (d.tractor && !t.resourceIds.includes(d.tractor)) t.resourceIds.push(d.tractor);
                if (d.plataforma && !t.resourceIds.includes(d.plataforma)) t.resourceIds.push(d.plataforma);
                if (d.conductor && !t.resourceIds.includes(d.conductor)) t.resourceIds.push(d.conductor);
            }
        });
    }

    parseDate(val) {
        if (!val) return new Date();
        if (Array.isArray(val)) {
            return new Date(val[0], (val[1] || 1) - 1, val[2] || 1, val[3] || 0, val[4] || 0, val[5] || 0);
        }
        if (typeof val === 'number') return new Date(val);
        if (typeof val === 'string') return new Date(val.replace(' ', 'T'));
        return new Date(val);
    }

    formatDate(val) {
        const d = this.parseDate(val);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    formatTimeOnly(val) {
        const d = this.parseDate(val);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    initDOM() {
        const cId = this.containerId;
        this.container.className = 'fg-container';
        this.container.innerHTML = `
            <div class="fg-toolbar">
                <div class="fg-toolbar-group fg-zoom-group">
                    <span class="fg-toolbar-label">Zoom:</span>
                    <button class="fg-btn fg-zoom-btn ${this.zoomHours === 1 ? 'active' : ''}" data-zoom="1">1h</button>
                    <button class="fg-btn fg-zoom-btn ${this.zoomHours === 2 ? 'active' : ''}" data-zoom="2">2h</button>
                    <button class="fg-btn fg-zoom-btn ${this.zoomHours === 4 ? 'active' : ''}" data-zoom="4">4h</button>
                    <button class="fg-btn fg-zoom-btn ${this.zoomHours === 24 ? 'active' : ''}" data-zoom="24">1 D&#237;a</button>
                </div>
                <div class="fg-toolbar-group fg-filter-group">
                    <select class="fg-select" id="${cId}_typeFilter" title="Filtrar por tipo de recurso">
                        <option value="ALL">Todos los Tipos</option>
                    </select>
                    <select class="fg-select" id="${cId}_statusFilter" title="Filtrar por estado">
                        <option value="ALL">Todos los Estados</option>
                    </select>
                    <div class="fg-search-box">
                        <span class="fg-search-icon">&#128269;</span>
                        <input type="text" class="fg-input fg-search-input" id="${cId}_search" placeholder="Buscar veh&#237;culo o viaje..." />
                        <button class="fg-search-clear" id="${cId}_searchClear" title="Limpiar b&#250;squeda">&times;</button>
                    </div>
                    <button class="fg-btn fg-btn-conflict" id="${cId}_conflictToggle" title="Filtrar solo actividades con conflicto">
                        &#9888;&#65039; Conflictos <span class="fg-conflict-badge" id="${cId}_conflictBadge">0</span>
                    </button>
                </div>
                <div class="fg-toolbar-group fg-action-group">
                    <button class="fg-btn fg-btn-export" id="${cId}_exportJson" title="Descargar datos en formato JSON">
                        &#128190; JSON
                    </button>
                </div>
            </div>

            <!-- Viewport con scroll horizontal y vertical unificado -->
            <div class="fg-grid-viewport" id="${cId}_viewport">
                <div class="fg-grid-matrix" id="${cId}_matrix">
                    <div class="fg-sidebar" id="${cId}_sidebar">
                        <div class="fg-sidebar-header">RECURSOS</div>
                    </div>
                    <div class="fg-timeline-area" id="${cId}_timelineArea">
                        <div class="fg-timeline-header" id="${cId}_header"></div>
                        <div class="fg-tracks" id="${cId}_tracks"></div>
                    </div>
                </div>
            </div>

            <div class="fg-tooltip" id="${cId}_tooltip"></div>
            <div class="fg-modal-overlay" id="${cId}_modalOverlay">
                <div class="fg-modal">
                    <div class="fg-modal-header">
                        <span id="${cId}_modalTitle">Detalle de Actividad</span>
                        <button class="fg-modal-close-btn" id="${cId}_modalClose">&times;</button>
                    </div>
                    <div class="fg-modal-body" id="${cId}_modalBody"></div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    populateDynamicFilters() {
        const cId = this.containerId;
        const typeSelect = document.getElementById(`${cId}_typeFilter`);
        const statusSelect = document.getElementById(`${cId}_statusFilter`);

        const types = new Set();
        this.rawSchedule.resources.forEach(r => { if (r.type) types.add(r.type); });
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t.charAt(0).toUpperCase() + t.slice(1);
            typeSelect.appendChild(opt);
        });

        const statuses = new Set();
        this.rawSchedule.tasks.forEach(task => {
            if (task.status && task.status !== 'libre') statuses.add(task.status);
        });
        statuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.innerText = s.replace(/_/g, ' ').toUpperCase();
            statusSelect.appendChild(opt);
        });
    }

    bindEvents() {
        const cId = this.containerId;

        // Botones de Zoom
        this.container.querySelectorAll('.fg-zoom-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.container.querySelectorAll('.fg-zoom-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.zoomHours = parseInt(target.getAttribute('data-zoom'), 10);
                this.hourWidth = this.calculateHourWidth(this.zoomHours);
                this.render();
            });
        });

        // Filtro por tipo
        document.getElementById(`${cId}_typeFilter`).addEventListener('change', (e) => {
            this.filterType = e.target.value;
            this.render();
        });

        // Filtro por estado
        const statusSel = document.getElementById(`${cId}_statusFilter`);
        statusSel.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.syncGlobalLegendActive();
            this.render();
        });

        // Búsqueda de texto
        const searchInput = document.getElementById(`${cId}_search`);
        const searchClear = document.getElementById(`${cId}_searchClear`);
        searchInput.addEventListener('input', (e) => {
            this.filterText = e.target.value.toLowerCase().trim();
            searchClear.style.display = this.filterText ? 'block' : 'none';
            this.render();
        });
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            this.filterText = '';
            searchClear.style.display = 'none';
            searchInput.focus();
            this.render();
        });

        // Toggle de conflictos
        const conflictBtn = document.getElementById(`${cId}_conflictToggle`);
        conflictBtn.addEventListener('click', () => {
            this.onlyConflicts = !this.onlyConflicts;
            conflictBtn.classList.toggle('active', this.onlyConflicts);
            this.syncGlobalLegendConflict();
            this.render();
        });

        // Exportar JSON
        document.getElementById(`${cId}_exportJson`).addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.rawSchedule, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", "ocupacion_flota.json");
            dlAnchor.click();
        });

        // Modal de detalle
        const overlay = document.getElementById(`${cId}_modalOverlay`);
        document.getElementById(`${cId}_modalClose`).addEventListener('click', () => overlay.style.display = 'none');
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });

        // Scroll horizontal con Shift + Rueda
        const viewport = document.getElementById(`${cId}_viewport`);
        if (viewport) {
            viewport.addEventListener('wheel', (e) => {
                if (e.shiftKey) {
                    viewport.scrollLeft += e.deltaY;
                }
            }, { passive: true });
        }
    }

    bindGlobalLegend() {
        const legendCard = document.getElementById('fgGlobalLegend');
        if (!legendCard) return;

        legendCard.querySelectorAll('.fg-legend-item[data-status]').forEach(item => {
            item.addEventListener('click', () => {
                const status = item.getAttribute('data-status');
                if (this.filterStatus === status) {
                    this.filterStatus = 'ALL';
                } else {
                    this.filterStatus = status;
                }
                const statusSel = document.getElementById(`${this.containerId}_statusFilter`);
                if (statusSel) statusSel.value = this.filterStatus;
                this.syncGlobalLegendActive();
                this.render();
            });
        });

        const conflictItem = legendCard.querySelector('.fg-legend-conflict');
        if (conflictItem) {
            conflictItem.addEventListener('click', () => {
                this.onlyConflicts = !this.onlyConflicts;
                const conflictBtn = document.getElementById(`${this.containerId}_conflictToggle`);
                if (conflictBtn) conflictBtn.classList.toggle('active', this.onlyConflicts);
                this.syncGlobalLegendConflict();
                this.render();
            });
        }
    }

    syncGlobalLegendActive() {
        const legendCard = document.getElementById('fgGlobalLegend');
        if (!legendCard) return;
        legendCard.querySelectorAll('.fg-legend-item[data-status]').forEach(item => {
            const status = item.getAttribute('data-status');
            item.classList.toggle('active', this.filterStatus === status);
        });
    }

    syncGlobalLegendConflict() {
        const legendCard = document.getElementById('fgGlobalLegend');
        if (!legendCard) return;
        const conflictItem = legendCard.querySelector('.fg-legend-conflict');
        if (conflictItem) {
            conflictItem.classList.toggle('active', this.onlyConflicts);
        }
    }

    computeTimelineBounds() {
        let minTime = Infinity;
        let maxTime = -Infinity;

        this.rawSchedule.tasks.forEach(t => {
            const s = this.parseDate(t.start).getTime();
            const e = this.parseDate(t.end).getTime();
            if (!isNaN(s) && s < minTime) minTime = s;
            if (!isNaN(e) && e > maxTime) maxTime = e;
        });

        if (minTime === Infinity) {
            minTime = Date.now();
            maxTime = Date.now() + 86400000;
        }

        const start = new Date(minTime);
        start.setHours(0, 0, 0, 0);
        this.startDate = start;

        const end = new Date(maxTime);
        end.setHours(end.getHours() + 4, 0, 0, 0);
        this.endDate = end;

        this.totalHours = Math.max(24, Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / 3600000));
    }

    detectClientConflicts() {
        const tasks = this.rawSchedule.tasks;
        let totalConflicts = 0;

        for (let i = 0; i < tasks.length; i++) {
            const t1 = tasks[i];
            if (t1.status === 'cancelado') continue;
            const s1 = this.parseDate(t1.start).getTime();
            const e1 = this.parseDate(t1.end).getTime();
            const r1 = t1.resourceIds || [];

            for (let j = i + 1; j < tasks.length; j++) {
                const t2 = tasks[j];
                if (t2.status === 'cancelado') continue;
                const s2 = this.parseDate(t2.start).getTime();
                const e2 = this.parseDate(t2.end).getTime();
                const r2 = t2.resourceIds || [];

                const overlap = (s1 < e2) && (s2 < e1);
                if (overlap) {
                    const sharesResource = r1.some(id => r2.includes(id));
                    if (sharesResource) {
                        t1.hasConflict = true;
                        t2.hasConflict = true;
                    }
                }
            }
            if (t1.hasConflict) totalConflicts++;
        }

        const badge = document.getElementById(`${this.containerId}_conflictBadge`);
        if (badge) {
            badge.innerText = totalConflicts;
            const conflictBtn = document.getElementById(`${this.containerId}_conflictToggle`);
            if (conflictBtn) {
                conflictBtn.classList.toggle('has-conflicts', totalConflicts > 0);
            }
        }
    }

    buildResourceTimeline(resourceId) {
        const assigned = [];
        this.rawSchedule.tasks.forEach(t => {
            if (Array.isArray(t.resourceIds) && t.resourceIds.includes(resourceId)) {
                assigned.push({ ...t, isFreeBlock: false });
            }
        });

        assigned.sort((a, b) => this.parseDate(a.start).getTime() - this.parseDate(b.start).getTime());

        const busyIntervals = [];
        assigned.forEach(t => {
            if (t.status === 'cancelado') return;
            busyIntervals.push({
                start: this.parseDate(t.start).getTime(),
                end: this.parseDate(t.end).getTime()
            });
        });
        busyIntervals.sort((a, b) => a.start - b.start);

        const mergedBusy = [];
        busyIntervals.forEach(curr => {
            if (!mergedBusy.length) {
                mergedBusy.push({ ...curr });
            } else {
                const prev = mergedBusy[mergedBusy.length - 1];
                if (curr.start <= prev.end) {
                    prev.end = Math.max(prev.end, curr.end);
                } else {
                    mergedBusy.push({ ...curr });
                }
            }
        });

        const result = [...assigned];
        let cursor = this.startDate.getTime();
        const minGapMs = 15 * 60 * 1000;

        mergedBusy.forEach((busy, idx) => {
            if (busy.start - cursor >= minGapMs) {
                result.push({
                    id: `free_${resourceId}_${idx}`,
                    name: 'Disponible',
                    start: new Date(cursor),
                    end: new Date(busy.start),
                    status: 'libre',
                    hasConflict: false,
                    isFreeBlock: true,
                    details: {}
                });
            }
            cursor = Math.max(cursor, busy.end);
        });

        if (this.endDate.getTime() - cursor >= minGapMs) {
            result.push({
                id: `free_${resourceId}_end`,
                name: 'Disponible',
                start: new Date(cursor),
                end: new Date(this.endDate.getTime()),
                status: 'libre',
                hasConflict: false,
                isFreeBlock: true,
                details: {}
            });
        }

        return result;
    }

    assignLanes(taskList) {
        taskList.sort((a, b) => this.parseDate(a.start).getTime() - this.parseDate(b.start).getTime());
        const laneEndTimes = [];

        taskList.forEach(task => {
            const s = this.parseDate(task.start).getTime();
            const e = this.parseDate(task.end).getTime();

            let placed = false;
            for (let i = 0; i < laneEndTimes.length; i++) {
                if (laneEndTimes[i] <= s) {
                    task._lane = i;
                    laneEndTimes[i] = e;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                task._lane = laneEndTimes.length;
                laneEndTimes.push(e);
            }
        });

        return Math.max(laneEndTimes.length, 1);
    }

    getStatusIcon(status) {
        switch (status) {
            case 'en_viaje': return '&#128666;';
            case 'en_carga': return '&#128230;';
            case 'mantenimiento': return '&#128295;';
            case 'averiado': return '&#9940;';
            case 'descanso': return '&#9749;';
            case 'retrasado': return '&#9200;';
            case 'cancelado': return '&#10060;';
            case 'reservado': return '&#128274;';
            default: return '';
        }
    }

    render() {
        const cId = this.containerId;
        const sidebar = document.getElementById(`${cId}_sidebar`);
        const header = document.getElementById(`${cId}_header`);
        const tracks = document.getElementById(`${cId}_tracks`);

        sidebar.innerHTML = `<div class="fg-sidebar-header">RECURSOS</div>`;
        header.innerHTML = '';
        tracks.innerHTML = '';

        const timelineWidth = this.totalHours * this.hourWidth;
        header.style.width = `${timelineWidth}px`;
        tracks.style.width = `${timelineWidth}px`;

        // 1. Cabecera de horas y marcas de rejilla
        for (let h = 0; h < this.totalHours; h += this.zoomHours) {
            const tickDate = new Date(this.startDate.getTime() + h * 3600000);
            const left = h * this.hourWidth;

            const tick = document.createElement('div');
            tick.className = 'fg-grid-tick';
            tick.style.left = `${left}px`;
            tracks.appendChild(tick);

            const label = document.createElement('div');
            label.className = 'fg-tick-label';
            label.style.left = `${left}px`;

            const dayStr = `${String(tickDate.getDate()).padStart(2, '0')}/${String(tickDate.getMonth() + 1).padStart(2, '0')}`;
            const timeStr = `${String(tickDate.getHours()).padStart(2, '0')}:00`;

            label.innerHTML = `<strong>${timeStr}</strong><br><span class="fg-tick-date">${dayStr}</span>`;
            header.appendChild(label);
        }

        // 2. Agrupación y filtrado de recursos
        const resourcesByGroup = {};
        this.rawSchedule.resources.forEach(r => {
            if (this.filterType !== 'ALL' && r.type !== this.filterType) return;
            if (this.filterText && !r.name.toLowerCase().includes(this.filterText) && !r.id.toLowerCase().includes(this.filterText)) return;

            if (this.onlyConflicts) {
                const hasConf = this.rawSchedule.tasks.some(t => {
                    return Array.isArray(t.resourceIds) && t.resourceIds.includes(r.id) && t.hasConflict;
                });
                if (!hasConf) return;
            }

            const grp = r.group || 'GENERAL';
            if (!resourcesByGroup[grp]) resourcesByGroup[grp] = [];
            resourcesByGroup[grp].push(r);
        });

        // 3. Renderizado de filas perfectamente alineadas
        Object.keys(resourcesByGroup).forEach(groupName => {
            const groupList = resourcesByGroup[groupName];

            // Cabecera del grupo en sidebar
            const groupDiv = document.createElement('div');
            groupDiv.className = 'fg-resource-group';
            groupDiv.innerHTML = `<span>${groupName}</span> <span class="fg-group-badge">${groupList.length}</span>`;
            sidebar.appendChild(groupDiv);

            // Espaciador de grupo en timeline (mismo alto exacto)
            const spacer = document.createElement('div');
            spacer.className = 'fg-track-group-spacer';
            spacer.style.width = `${timelineWidth}px`;
            tracks.appendChild(spacer);

            groupList.forEach(resource => {
                let resTasks = this.buildResourceTimeline(resource.id);

                if (this.filterStatus !== 'ALL') {
                    resTasks = resTasks.filter(t => t.status === this.filterStatus);
                }

                // Detección de solapamiento local exclusivo en este recurso
                const realTasks = resTasks.filter(t => !t.isFreeBlock && t.status !== 'cancelado');
                const localOverlappingIds = new Set();

                for (let i = 0; i < realTasks.length; i++) {
                    const t1 = realTasks[i];
                    const s1 = this.parseDate(t1.start).getTime();
                    const e1 = this.parseDate(t1.end).getTime();

                    for (let j = i + 1; j < realTasks.length; j++) {
                        const t2 = realTasks[j];
                        const s2 = this.parseDate(t2.start).getTime();
                        const e2 = this.parseDate(t2.end).getTime();

                        if (s1 < e2 && s2 < e1) {
                            localOverlappingIds.add(t1.id);
                            localOverlappingIds.add(t2.id);
                        }
                    }
                }

                const numLanes = this.assignLanes(realTasks);
                const hasLocalCollisions = localOverlappingIds.size > 0;
                
                // Alturas ergonómicas y bien proporcionadas
                const laneStep = 28;
                const barHeight = hasLocalCollisions ? 22 : 28;
                const rowHeight = hasLocalCollisions ? (numLanes * laneStep + 10) : 46;

                // Fila en el sidebar
                const resRow = document.createElement('div');
                resRow.className = 'fg-resource-row';
                resRow.style.height = `${rowHeight}px`;
                resRow.title = resource.name;

                let laneBadge = '';
                if (hasLocalCollisions && numLanes > 1) {
                    laneBadge = `<span class="fg-lane-badge" title="${numLanes} actividades solapadas">&#9888;&#65039; ${numLanes} lanes</span>`;
                }
                resRow.innerHTML = `<span class="fg-resource-name">${resource.name}</span>${laneBadge}`;
                sidebar.appendChild(resRow);

                // Fila en el timeline
                const trackRow = document.createElement('div');
                trackRow.className = 'fg-track-row';
                trackRow.style.height = `${rowHeight}px`;
                trackRow.setAttribute('data-resource-id', resource.id);

                resTasks.forEach(task => {
                    const tStart = this.parseDate(task.start).getTime();
                    const tEnd = this.parseDate(task.end).getTime();

                    const leftHours = (tStart - this.startDate.getTime()) / 3600000;
                    const durationHours = (tEnd - tStart) / 3600000;

                    const leftPx = leftHours * this.hourWidth;
                    const widthPx = Math.max(durationHours * this.hourWidth, 18);

                    const hasLocalOverlap = localOverlappingIds.has(task.id);
                    const isCompact = hasLocalOverlap;

                    let topPx;
                    let currentBarHeight = barHeight;

                    if (task.isFreeBlock) {
                        currentBarHeight = rowHeight - 8;
                        topPx = 4;
                    } else if (isCompact) {
                        topPx = (task._lane || 0) * laneStep + 5;
                    } else {
                        topPx = Math.round((rowHeight - barHeight) / 2);
                    }

                    const bar = document.createElement('div');
                    const conflictClass = task.hasConflict ? ' fg-has-conflict' : '';
                    const compactClass = isCompact ? ' fg-bar-compact' : '';
                    bar.className = `fg-bar fg-status-${task.status}${conflictClass}${compactClass}`;

                    bar.style.left = `${leftPx}px`;
                    bar.style.width = `${widthPx}px`;
                    bar.style.top = `${topPx}px`;
                    bar.style.height = `${currentBarHeight}px`;
                    bar.setAttribute('data-task-id', task.id);

                    if (task.isFreeBlock) {
                        // Limpieza visual: no saturar con "Disponible" en bloques pequeños
                        if (widthPx >= 110) {
                            bar.innerHTML = `<span class="fg-free-text">Disponible (${durationHours.toFixed(1)}h)</span>`;
                        }
                    } else {
                        const icon = this.getStatusIcon(task.status);
                        const conflictIcon = task.hasConflict ? '<span class="fg-icon-conflict">&#9888;&#65039;</span>' : '';
                        bar.innerHTML = `${conflictIcon}<span class="fg-bar-icon">${icon}</span><span class="fg-bar-title">${task.name}</span>`;
                    }

                    bar.addEventListener('mouseenter', (e) => {
                        this.showTooltip(e, task, resource, hasLocalOverlap);
                        this.highlightRelatedTasks(task.id, true);
                    });
                    bar.addEventListener('mousemove', (e) => this.moveTooltip(e));
                    bar.addEventListener('mouseleave', () => {
                        this.hideTooltip();
                        this.highlightRelatedTasks(task.id, false);
                    });
                    bar.addEventListener('click', () => {
                        if (!task.isFreeBlock) {
                            this.openTaskModal(task, resource);
                        }
                    });

                    trackRow.appendChild(bar);
                });

                tracks.appendChild(trackRow);
            });
        });
    }

    highlightRelatedTasks(taskId, highlight) {
        if (!taskId || taskId.startsWith('free_')) return;
        const matchingBars = this.container.querySelectorAll(`[data-task-id="${taskId}"]`);
        matchingBars.forEach(b => b.classList.toggle('fg-bar-highlighted', highlight));
    }

    showTooltip(e, task, resource, hasLocalOverlap) {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        if (!tt) return;

        if (task.isFreeBlock) {
            const startStr = this.formatDate(task.start);
            const endStr = this.formatDate(task.end);
            const diffHours = ((this.parseDate(task.end).getTime() - this.parseDate(task.start).getTime()) / 3600000).toFixed(1);

            tt.innerHTML = `
                <div class="fg-tt-header fg-tt-free-header">
                    <span>&#9898; HUECO DISPONIBLE</span>
                    <span class="fg-tt-duration">${diffHours} h</span>
                </div>
                <div class="fg-tt-body">
                    <div class="fg-tt-row"><strong>Recurso:</strong> <span>${resource.name}</span></div>
                    <div class="fg-tt-row"><strong>Tramo:</strong> <span>${startStr} &#8594; ${endStr}</span></div>
                </div>
            `;
            tt.style.display = 'block';
            this.moveTooltip(e);
            return;
        }

        let conflictBanner = '';
        if (task.hasConflict) {
            if (hasLocalOverlap) {
                conflictBanner = '<div class="fg-tt-conflict-alert">&#9888;&#65039; Conflicto directo: Solapamiento en este recurso</div>';
            } else {
                conflictBanner = '<div class="fg-tt-conflict-warn">&#9888;&#65039; Aviso: Conflicto en otro recurso asociado (conductor o plataforma)</div>';
            }
        }

        const statusLabel = (task.status || '').replace(/_/g, ' ').toUpperCase();

        let detailsHtml = '';
        if (task.details && typeof task.details === 'object') {
            Object.entries(task.details).forEach(([key, val]) => {
                if (val !== null && val !== undefined && val !== '') {
                    detailsHtml += `<div class="fg-tt-row"><strong>${key}:</strong> <span>${val}</span></div>`;
                }
            });
        }

        const assignedResNames = (task.resourceIds || [])
            .map(id => {
                const res = this.rawSchedule.resources.find(r => r.id === id);
                return res ? res.name : id;
            })
            .join(', ');

        const durationHours = ((this.parseDate(task.end).getTime() - this.parseDate(task.start).getTime()) / 3600000).toFixed(1);

        tt.innerHTML = `
            ${conflictBanner}
            <div class="fg-tt-header fg-tt-status-${task.status}">
                <span>${task.name}</span>
                <span class="fg-tt-badge">${statusLabel}</span>
            </div>
            <div class="fg-tt-body">
                <div class="fg-tt-row"><strong>Fila activa:</strong> <span>${resource.name}</span></div>
                <div class="fg-tt-row"><strong>Horario:</strong> <span>${this.formatDate(task.start)} &#8594; ${this.formatTimeOnly(task.end)} (${durationHours}h)</span></div>
                ${assignedResNames ? `<div class="fg-tt-row"><strong>Asignados:</strong> <span>${assignedResNames}</span></div>` : ''}
                ${detailsHtml}
            </div>
        `;
        tt.style.display = 'block';
        this.moveTooltip(e);
    }

    moveTooltip(e) {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        if (!tt) return;

        const ttWidth = tt.offsetWidth || 280;
        const ttHeight = tt.offsetHeight || 140;

        let left = e.clientX + 16;
        let top = e.clientY + 16;

        if (left + ttWidth > window.innerWidth - 12) {
            left = e.clientX - ttWidth - 12;
        }
        if (top + ttHeight > window.innerHeight - 12) {
            top = e.clientY - ttHeight - 12;
        }

        tt.style.left = `${Math.max(10, left)}px`;
        tt.style.top = `${Math.max(10, top)}px`;
    }

    hideTooltip() {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        if (tt) tt.style.display = 'none';
    }

    openTaskModal(task, resource) {
        const cId = this.containerId;
        document.getElementById(`${cId}_modalTitle`).innerText = task.name;

        let dynamicRows = '';
        if (task.details && typeof task.details === 'object') {
            Object.entries(task.details).forEach(([key, val]) => {
                if (val !== null && val !== undefined) {
                    dynamicRows += `<div class="fg-modal-row"><span class="fg-modal-label">${key}:</span><span>${val}</span></div>`;
                }
            });
        }

        const assignedResList = (task.resourceIds || [])
            .map(id => {
                const r = this.rawSchedule.resources.find(item => item.id === id);
                return r ? `${r.name} (${r.type || 'General'})` : id;
            })
            .join(' | ');

        const durationHours = ((this.parseDate(task.end).getTime() - this.parseDate(task.start).getTime()) / 3600000).toFixed(1);

        document.getElementById(`${cId}_modalBody`).innerHTML = `
            <div class="fg-modal-row"><span class="fg-modal-label">ID Actividad:</span><span>${task.id}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Estado:</span><span class="fg-modal-status-badge fg-status-${task.status}">${task.status.toUpperCase()}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Recurso actual:</span><span>${resource.name} (${resource.type || 'N/A'})</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Inicio:</span><span>${this.formatDate(task.start)}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Fin:</span><span>${this.formatDate(task.end)}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Duraci&#243;n total:</span><span>${durationHours} horas</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Equipo asignado:</span><span>${assignedResList || 'Ninguno'}</span></div>
            ${task.hasConflict ? `<div class="fg-modal-row fg-modal-alert"><span class="fg-modal-label">&#9888;&#65039; Conflicto:</span><span>Solapamiento temporal detectado con otra actividad</span></div>` : ''}
            ${dynamicRows}
        `;

        document.getElementById(`${cId}_modalOverlay`).style.display = 'flex';
    }
}