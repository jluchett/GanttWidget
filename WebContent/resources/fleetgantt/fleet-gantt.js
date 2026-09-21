class FleetGanttViewer {
    constructor(config) {
        this.containerId = config.containerId;
        this.container = document.getElementById(this.containerId);
        this.rawSchedule = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        this.zoomHours = config.defaultZoomHours || 2; // Granularidad por defecto (2h)
        this.hourWidth = 60; // Ancho en px por cada hora
        this.filterType = 'ALL';
        this.filterStatus = 'ALL';
        this.filterText = '';
        this.onlyConflicts = false;

        this.initDOM();
        this.computeTimelineBounds();
        this.detectClientConflicts();
        this.render();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="fg-toolbar">
                <div class="fg-toolbar-group">
                    <button class="fg-btn" data-zoom="1">1h</button>
                    <button class="fg-btn active" data-zoom="2">2h</button>
                    <button class="fg-btn" data-zoom="4">4h</button>
                    <button class="fg-btn" data-zoom="24">1 Día</button>
                </div>
                <div class="fg-toolbar-group">
                    <select class="fg-select" id="${this.containerId}_typeFilter">
                        <option value="ALL">Todos los Tipos</option>
                        <option value="tractor">Tractores</option>
                        <option value="plataforma">Plataformas</option>
                        <option value="conductor">Conductores</option>
                    </select>
                    <select class="fg-select" id="${this.containerId}_statusFilter">
                        <option value="ALL">Todos los Estados</option>
                        <option value="en_viaje">En Viaje</option>
                        <option value="en_carga">En Carga</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="averiado">Averiado</option>
                        <option value="descanso">Descanso</option>
                        <option value="retrasado">Retrasado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="libre">Libre</option>
                        <option value="reservado">Reservado</option>
                    </select>
                    <input type="text" class="fg-input" id="${this.containerId}_search" placeholder="Buscar vehículo o viaje...">
                    <button class="fg-btn" id="${this.containerId}_conflictToggle">⚠️ Conflictos</button>
                </div>
                <div class="fg-toolbar-group">
                    <button class="fg-btn" id="${this.containerId}_exportJson">JSON</button>
                </div>
            </div>
            <div class="fg-body">
                <div class="fg-sidebar" id="${this.containerId}_sidebar"></div>
                <div class="fg-timeline-scroll" id="${this.containerId}_scroll">
                    <div class="fg-timeline-header" id="${this.containerId}_header"></div>
                    <div class="fg-tracks" id="${this.containerId}_tracks"></div>
                </div>
            </div>
            <div class="fg-tooltip" id="${this.containerId}_tooltip"></div>
            <div class="fg-modal-overlay" id="${this.containerId}_modalOverlay">
                <div class="fg-modal">
                    <div class="fg-modal-header">
                        <h4 id="${this.containerId}_modalTitle" style="margin:0;">Detalle</h4>
                        <button class="fg-btn" id="${this.containerId}_modalClose">&times;</button>
                    </div>
                    <div class="fg-modal-body" id="${this.containerId}_modalBody"></div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const cId = this.containerId;
        // Botones de Zoom
        this.container.querySelectorAll('.fg-toolbar [data-zoom]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.container.querySelectorAll('.fg-toolbar [data-zoom]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.zoomHours = parseInt(e.target.getAttribute('data-zoom'), 10);
                this.hourWidth = this.zoomHours === 1 ? 100 : (this.zoomHours === 2 ? 60 : (this.zoomHours === 4 ? 35 : 15));
                this.render();
            });
        });

        // Filtros
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
            dlAnchor.setAttribute("download", "fleet_occupancy.json");
            dlAnchor.click();
        });

        // Modal close
        const overlay = document.getElementById(`${cId}_modalOverlay`);
        document.getElementById(`${cId}_modalClose`).addEventListener('click', () => overlay.style.display = 'none');
        overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.style.display = 'none'; });
    }

    computeTimelineBounds() {
        let minTime = Infinity;
        let maxTime = -Infinity;

        this.rawSchedule.tasks.forEach(t => {
            const s = new Date(t.start).getTime();
            const e = new Date(t.end).getTime();
            if (s < minTime) minTime = s;
            if (e > maxTime) maxTime = e;
        });

        if (minTime === Infinity) {
            minTime = Date.now();
            maxTime = Date.now() + 86400000;
        }

        // Redondear al inicio de hora
        const start = new Date(minTime);
        start.setMinutes(0, 0, 0);
        this.startDate = start;

        const end = new Date(maxTime);
        end.setHours(end.getHours() + 4, 0, 0, 0);
        this.endDate = end;

        this.totalHours = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / 3600000);
    }

    detectClientConflicts() {
        const byResource = {};
        this.rawSchedule.tasks.forEach(t => {
            if (t.status === 'cancelado') return;
            if (!byResource[t.resourceId]) byResource[t.resourceId] = [];
            byResource[t.resourceId].push(t);
        });

        Object.values(byResource).forEach(taskList => {
            for (let i = 0; i < taskList.length; i++) {
                const t1 = taskList[i];
                const s1 = new Date(t1.start).getTime();
                const e1 = new Date(t1.end).getTime();

                for (let j = i + 1; j < taskList.length; j++) {
                    const t2 = taskList[j];
                    const s2 = new Date(t2.start).getTime();
                    const e2 = new Date(t2.end).getTime();

                    if (s1 < e2 && s2 < e1) {
                        t1.hasConflict = true;
                        t2.hasConflict = true;
                    }
                }
            }
        });
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

        // 1. Render Encabezado de Horas
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
            
            const dayStr = tickDate.getDate() + '/' + (tickDate.getMonth() + 1);
            const timeStr = String(tickDate.getHours()).padStart(2, '0') + ':00';
            label.innerHTML = `<strong>${timeStr}</strong><br><span style="font-size:9px;color:#8c959f">${dayStr}</span>`;
            header.appendChild(label);
        }

        // 2. Filtrar Recursos y Tareas
        const resourcesByGroup = {};
        this.rawSchedule.resources.forEach(r => {
            // Filtro tipo
            if (this.filterType !== 'ALL' && r.type !== this.filterType) return;
            // Filtro texto
            if (this.filterText && !r.name.toLowerCase().includes(this.filterText) && !r.id.toLowerCase().includes(this.filterText)) return;
            
            // Si el filtro "solo conflictos" está activo
            if (this.onlyConflicts) {
                const hasConf = this.rawSchedule.tasks.some(t => t.resourceId === r.id && t.hasConflict);
                if (!hasConf) return;
            }

            const grp = r.group || 'GENERAL';
            if (!resourcesByGroup[grp]) resourcesByGroup[grp] = [];
            resourcesByGroup[grp].push(r);
        });

        // 3. Render Filas
        Object.keys(resourcesByGroup).forEach(groupName => {
            // Cabecera de grupo
            sidebar.innerHTML += `<div class="fg-resource-group">${groupName}</div>`;
            tracks.innerHTML += `<div class="fg-track-group-spacer"></div>`;

            resourcesByGroup[groupName].forEach(resource => {
                sidebar.innerHTML += `<div class="fg-resource-row" title="${resource.name}">${resource.name}</div>`;

                const trackRow = document.createElement('div');
                trackRow.className = 'fg-track-row';
                trackRow.setAttribute('data-resource-id', resource.id);

                // Obtener tareas del recurso
                const resTasks = this.rawSchedule.tasks.filter(t => t.resourceId === resource.id);

                resTasks.forEach(task => {
                    // Filtro estado
                    if (this.filterStatus !== 'ALL' && task.status !== this.filterStatus) return;

                    const tStart = new Date(task.start).getTime();
                    const tEnd = new Date(task.end).getTime();

                    const leftHours = (tStart - this.startDate.getTime()) / 3600000;
                    const durationHours = (tEnd - tStart) / 3600000;

                    const leftPx = leftHours * this.hourWidth;
                    const widthPx = Math.max(durationHours * this.hourWidth, 14);

                    const bar = document.createElement('div');
                    bar.className = `fg-bar fg-status-${task.status} ${task.hasConflict ? 'fg-has-conflict' : ''}`;
                    bar.style.left = `${leftPx}px`;
                    bar.style.width = `${widthPx}px`;
                    
                    const conflictBadge = task.hasConflict ? '⚠️ ' : '';
                    bar.innerHTML = `${conflictBadge}${task.name}`;

                    // Tooltip Events
                    bar.addEventListener('mouseenter', (e) => this.showTooltip(e, task, resource));
                    bar.addEventListener('mousemove', (e) => this.moveTooltip(e));
                    bar.addEventListener('mouseleave', () => this.hideTooltip());

                    // Click -> Modal
                    bar.addEventListener('click', () => this.openTaskModal(task, resource));

                    trackRow.appendChild(bar);
                });

                tracks.appendChild(trackRow);
            });
        });
    }

    showTooltip(e, task, resource) {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        const d = task.details || {};
        
        let conflictMsg = task.hasConflict 
            ? `<div style="color:#ff6b6b;font-weight:bold;margin-bottom:4px;">⚠️ Conflicto: Solapamiento en recurso</div>` 
            : '';

        tt.innerHTML = `
            ${conflictMsg}
            <div style="font-weight:bold;font-size:13px;border-bottom:1px solid #444;padding-bottom:3px;margin-bottom:4px;">
                ${task.name} (${task.status.toUpperCase()})
            </div>
            <div><strong>Recurso:</strong> ${resource.name}</div>
            <div><strong>Horario:</strong> ${task.start.replace('T',' ')} &rarr; ${task.end.replace('T',' ')}</div>
            ${d.origen ? `<div><strong>Ruta:</strong> ${d.origen} &rarr; ${d.destino || '?'}</div>` : ''}
            ${d.conductor ? `<div><strong>Conductor:</strong> ${d.conductor}</div>` : ''}
            ${d.plataforma ? `<div><strong>Plataforma:</strong> ${d.plataforma}</div>` : ''}
            ${d.observaciones ? `<div style="color:#f0883e;margin-top:3px;"><em>Obs: ${d.observaciones}</em></div>` : ''}
        `;
        tt.style.display = 'block';
        this.moveTooltip(e);
    }

    moveTooltip(e) {
        const tt = document.getElementById(`${this.containerId}_tooltip`);
        tt.style.left = `${e.clientX + 15}px`;
        tt.style.top = `${e.clientY + 15}px`;
    }

    hideTooltip() {
        document.getElementById(`${this.containerId}_tooltip`).style.display = 'none';
    }

    openTaskModal(task, resource) {
        const cId = this.containerId;
        const d = task.details || {};
        document.getElementById(`${cId}_modalTitle`).innerText = task.name;
        
        document.getElementById(`${cId}_modalBody`).innerHTML = `
            <div class="fg-modal-row"><span class="fg-modal-label">ID Tarea:</span><span>${task.id}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Estado:</span><span style="font-weight:bold">${task.status}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Recurso:</span><span>${resource.name} (${resource.type})</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Inicio:</span><span>${task.start}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Fin:</span><span>${task.end}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Origen:</span><span>${d.origen || 'N/A'}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Destino:</span><span>${d.destino || 'N/A'}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Conductor:</span><span>${d.conductor || 'N/A'}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Plataforma:</span><span>${d.plataforma || 'N/A'}</span></div>
            <div class="fg-modal-row"><span class="fg-modal-label">Observaciones:</span><span>${d.observaciones || 'Sin notas'}</span></div>
        `;

        document.getElementById(`${cId}_modalOverlay`).style.display = 'flex';
    }
}