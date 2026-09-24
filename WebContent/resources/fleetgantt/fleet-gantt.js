class FleetGanttViewer {
    constructor(config) {
        this.containerId = config.containerId;
        this.container = document.getElementById(this.containerId);
        this.rawSchedule = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        this.zoomHours = config.defaultZoomHours || 2;
        this.hourWidth = 60;
        this.filterType = 'ALL';
        this.filterStatus = 'ALL';
        this.filterText = '';
        this.onlyConflicts = false;

        this.normalizeTasks();
        this.initDOM();
        this.populateDynamicFilters();
        this.detectClientConflicts();
        this.computeTimelineBounds();
        this.render();
    }

    // Normaliza resourceIds soportando tanto el formato nuevo como el anterior
    normalizeTasks() {
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

    initDOM() {
        const cId = this.containerId;
        this.container.innerHTML = `
            <div class="fg-toolbar">
                <div class="fg-toolbar-group">
                    <button class="fg-btn" data-zoom="1">1h</button>
                    <button class="fg-btn active" data-zoom="2">2h</button>
                    <button class="fg-btn" data-zoom="4">4h</button>
                    <button class="fg-btn" data-zoom="24">1 Día</button>
                </div>
                <div class="fg-toolbar-group">
                    <select class="fg-select" id="${cId}_typeFilter">
                        <option value="ALL">Todos los Tipos</option>
                    </select>
                    <select class="fg-select" id="${cId}_statusFilter">
                        <option value="ALL">Todos los Estados</option>
                    </select>
                    <input type="text" class="fg-input" id="${cId}_search" placeholder="Buscar recurso o actividad...">
                    <button class="fg-btn" id="${cId}_conflictToggle">⚠️ Conflictos</button>
                </div>
                <div class="fg-toolbar-group">
                    <button class="fg-btn" id="${cId}_exportJson">JSON</button>
                </div>
            </div>
            <div class="fg-body">
                <div class="fg-sidebar" id="${cId}_sidebar"></div>
                <div class="fg-timeline-scroll" id="${cId}_scroll">
                    <div class="fg-timeline-header" id="${cId}_header"></div>
                    <div class="fg-tracks" id="${cId}_tracks"></div>
                </div>
            </div>
            <div class="fg-tooltip" id="${cId}_tooltip"></div>
            <div class="fg-modal-overlay" id="${cId}_modalOverlay">
                <div class="fg-modal">
                    <div class="fg-modal-header">
                        <h4 id="${cId}_modalTitle" style="margin:0;">Detalle</h4>
                        <button class="fg-btn" id="${cId}_modalClose">&times;</button>
                    </div>
                    <div class="fg-modal-body" id="${cId}_modalBody"></div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    // Extrae y puebla dinámicamente los selectores según el dataset suministrado
    populateDynamicFilters() {
        const cId = this.containerId;
        const typeSelect = document.getElementById(`${cId}_typeFilter`);
        const statusSelect = document.getElementById(`${cId}_statusFilter`);

        const types = new Set();
        this.rawSchedule.resources.forEach(r => {
            if (r.type) types.add(r.type);
        });

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
        this.container.querySelectorAll('.fg-toolbar [data-zoom]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.container.querySelectorAll('.fg-toolbar [data-zoom]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.zoomHours = parseInt(e.target.getAttribute('data-zoom'), 10);
                this.hourWidth = this.zoomHours === 1 ? 100 : (this.zoomHours === 2 ? 60 : (this.zoomHours === 4 ? 35 : 15));
                this.render();
            });
        });

        document.getElementById(`${cId}_typeFilter`).addEventListener('change', (e) => {
            this.filterType = e.target.value;
            this.render();
        });

        document.getElementById(`${cId}_statusFilter`).addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.render();
        });

        document.getElementById(`${cId}_search`).addEventListener('input', (e) => {
            this.filterText = e.target.value.toLowerCase();
            this.render();
        });

        document.getElementById(`${cId}_conflictToggle`).addEventListener('click', (e) => {
            this.onlyConflicts = !this.onlyConflicts;
            e.target.classList.toggle('active', this.onlyConflicts);
            this.render();
        });

        document.getElementById(`${cId}_exportJson`).addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.rawSchedule, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", "schedule_export.json");
            dlAnchor.click();
        });

        const overlay = document.getElementById(`${cId}_modalOverlay`);
        document.getElementById(`${cId}_modalClose`).addEventListener('click', () => overlay.style.display = 'none');
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });
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

    // Detección general: dos tareas chocan si se solapan en tiempo y comparten cualquier ID de recurso
    detectClientConflicts() {
        const tasks = this.rawSchedule.tasks;
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
        }
    }

    // Construye la línea de tiempo de un recurso calculando los huecos "Libres"
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

        // 1. Encabezado de Horas
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

            label.innerHTML = `<strong>${timeStr}</strong><br><span style="font-size:10px;color:#656d76">${dayStr}</span>`;
            header.appendChild(label);
        }

        // 2. Filtrar Recursos
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

        // 3. Renderizar Filas
        Object.keys(resourcesByGroup).forEach(groupName => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'fg-resource-group';
            groupDiv.innerText = groupName;
            sidebar.appendChild(groupDiv);

            const spacer = document.createElement('div');
            spacer.className = 'fg-track-group-spacer';
            tracks.appendChild(spacer);

            resourcesByGroup[groupName].forEach(resource => {
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
                const laneStep = 24;
                const rowHeight = hasLocalCollisions ? (numLanes * laneStep + 8) : 44;

                const resRow = document.createElement('div');
                resRow.className = 'fg-resource-row';
                resRow.style.height = `${rowHeight}px`;
                resRow.title = resource.name;
                resRow.innerText = resource.name;
                sidebar.appendChild(resRow);

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
                    const widthPx = Math.max(durationHours * this.hourWidth, 24);

                    const hasLocalOverlap = localOverlappingIds.has(task.id);
                    const isCompact = hasLocalOverlap;

                    let barHeight;
                    if (task.isFreeBlock) {
                        barHeight = 26;
                    } else {
                        barHeight = isCompact ? 20 : 32;
                    }

                    let topPx;
                    if (isCompact) {
                        topPx = (task._lane || 0) * laneStep + 4;
                    } else {
                        topPx = Math.round((rowHeight - barHeight) / 2);
                    }

                    const bar = document.createElement('div');
                    const conflictClass = task.hasConflict ? ' fg-has-conflict' : '';
                    const compactClass = isCompact ? ' fg-bar-compact' : '';
                    bar.className = `fg-bar fg-status-${task.status}${conflictClass}${compactClass}`;

                    // Color personalizado opcional si viene definido directamente en la tarea
                    if (task.color && !task.isFreeBlock) {
                        bar.style.backgroundColor = task.color;
                    }

                    bar.style.left = `${leftPx}px`;
                    bar.style.width = `${widthPx}px`;
                    bar.style.top = `${topPx}px`;
                    bar.style.height = `${barHeight}px`;
                    bar.setAttribute('data-task-id', task.id);

                    const conflictIcon = task.hasConflict ? '⚠️ ' : '';
                    bar.innerHTML = `${conflictIcon}${task.name}`;

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

    // Tooltip reflexivo: itera sobre cualquier campo de details dinámicamente
    showTooltip(e, task, resource, hasLocalOverlap) {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        if (!tt) return;

        if (task.isFreeBlock) {
            const startStr = this.formatDate(task.start);
            const endStr = this.formatDate(task.end);
            const diffHours = ((this.parseDate(task.end).getTime() - this.parseDate(task.start).getTime()) / 3600000).toFixed(1);

            tt.innerHTML = `
                <div style="font-weight:bold;font-size:13px;border-bottom:1px solid #444;padding-bottom:3px;margin-bottom:4px;color:#7ee787;">
                    DISPONIBLE
                </div>
                <div><strong>Recurso:</strong> ${resource.name}</div>
                <div><strong>Horario:</strong> ${startStr} &rarr; ${endStr}</div>
                <div><strong>Tiempo disponible:</strong> ${diffHours} h</div>
            `;
            tt.style.display = 'block';
            this.moveTooltip(e);
            return;
        }

        let conflictMsg = '';
        if (task.hasConflict) {
            if (hasLocalOverlap) {
                conflictMsg = '<div style="color:#ff6b6b;font-weight:bold;margin-bottom:4px;">⚠️ Conflicto: Solapamiento directo en este recurso</div>';
            } else {
                conflictMsg = '<div style="color:#f0883e;font-weight:bold;margin-bottom:4px;">⚠️ Conflicto en otro recurso compartido de esta tarea</div>';
            }
        }

        const statusLabel = (task.status || '').replace(/_/g, ' ').toUpperCase();

        // Renderizado dinámico reflexivo de cualquier propiedad en details
        let detailsHtml = '';
        if (task.details && typeof task.details === 'object') {
            Object.entries(task.details).forEach(([key, val]) => {
                if (val !== null && val !== undefined && val !== '') {
                    detailsHtml += `<div><strong>${key}:</strong> ${val}</div>`;
                }
            });
        }

        // Mostrar lista de todos los recursos vinculados
        const assignedResNames = (task.resourceIds || [])
            .map(id => {
                const res = this.rawSchedule.resources.find(r => r.id === id);
                return res ? res.name : id;
            })
            .join(', ');

        tt.innerHTML = `
            ${conflictMsg}
            <div style="font-weight:bold;font-size:13px;border-bottom:1px solid #444;padding-bottom:3px;margin-bottom:4px;">
                ${task.name} (${statusLabel})
            </div>
            <div><strong>Fila actual:</strong> ${resource.name}</div>
            <div><strong>Horario:</strong> ${this.formatDate(task.start)} &rarr; ${this.formatDate(task.end)}</div>
            ${assignedResNames ? `<div><strong>Recursos asignados:</strong> ${assignedResNames}</div>` : ''}
            ${detailsHtml}
        `;
        tt.style.display = 'block';
        this.moveTooltip(e);
    }

    moveTooltip(e) {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        if (!tt) return;
        tt.style.left = `${e.clientX + 15}px`;
        tt.style.top = `${e.clientY + 15}px`;
    }

    hideTooltip() {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        if (tt) tt.style.display = 'none';
    }

    // Modal reflexivo: genera una fila de visualización por cada clave del objeto details
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

        document.getElementById(`${cId}_modalBody`).innerHTML = `
            <div class="fg-modal-row"><span class="fg-modal-label">ID Actividad:</span><span>${task.id}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Estado:</span><span style="font-weight:bold">${task.status}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Fila visible:</span><span>${resource.name} (${resource.type || 'N/A'})</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Inicio:</span><span>${this.formatDate(task.start)}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Fin:</span><span>${this.formatDate(task.end)}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Recursos:</span><span>${assignedResList || 'Ninguno'}</span></div>
            ${dynamicRows}
        `;

        document.getElementById(`${cId}_modalOverlay`).style.display = 'flex';
    }
}