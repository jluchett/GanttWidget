package com.fleet.gantt.service;

import com.fleet.gantt.model.FleetTask;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;

public class FleetConflictService implements Serializable {

    private static final long serialVersionUID = 1L;

    public void detectAndMarkConflicts(List<FleetTask> tasks) {
        if (tasks == null || tasks.size() < 2) return;

        for (int i = 0; i < tasks.size(); i++) {
            FleetTask t1 = tasks.get(i);
            if ("cancelado".equalsIgnoreCase(t1.getStatus())) continue;

            for (int j = i + 1; j < tasks.size(); j++) {
                FleetTask t2 = tasks.get(j);
                if ("cancelado".equalsIgnoreCase(t2.getStatus())) continue;

                // 1. Solapamiento de tiempo
                boolean overlap = t1.getStart().isBefore(t2.getEnd()) && t2.getStart().isBefore(t1.getEnd());

                // 2. Conflicto si comparten al menos un recurso en su lista
                if (overlap && !Collections.disjoint(t1.getResourceIds(), t2.getResourceIds())) {
                    t1.setHasConflict(true);
                    t2.setHasConflict(true);

                    if (!t1.getConflictingTaskIds().contains(t2.getId())) {
                        t1.getConflictingTaskIds().add(t2.getId());
                    }
                    if (!t2.getConflictingTaskIds().contains(t1.getId())) {
                        t2.getConflictingTaskIds().add(t1.getId());
                    }
                }
            }
        }
    }
}