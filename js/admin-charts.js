/* ============================================================
   MASIVO CONTROL — Gráficos SVG sin dependencias
   ============================================================ */

(() => {
  "use strict";

  let counter = 0;
  const nextId = (prefix) => `${prefix}-${++counter}`;

  const compact = (value) => {
    const number = Number(value || 0);
    const abs = Math.abs(number);
    if (abs >= 1000000) return `${(number / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(".", ",")}M`;
    if (abs >= 1000) return `${(number / 1000).toFixed(abs >= 100000 ? 0 : 1).replace(".", ",")}k`;
    return String(Math.round(number));
  };

  function spark(values, options = {}) {
    const { color = "#00e5ff", width = 150, height = 40 } = options;
    if (!values || values.length < 2) return "";
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = width / (values.length - 1);
    const points = values.map((value, index) => {
      const x = index * step;
      const y = height - 4 - ((value - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const id = nextId("spark");
    const area = `0,${height} ${points.join(" ")} ${width},${height}`;
    return `
      <svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
        <defs>
          <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity=".28"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${area}" fill="url(#${id})"/>
        <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${width}" cy="${points[points.length - 1].split(",")[1]}" r="2.6" fill="${color}">
          <animate attributeName="r" values="2.2;3.4;2.2" dur="2.4s" repeatCount="indefinite"/>
        </circle>
      </svg>`;
  }

  function areaChart(labels, series, options = {}) {
    const {
      height = 300,
      colors = ["#00e5ff", "#8b6cff", "#3dffa8"],
      format = compact,
      suffix = ""
    } = options;
    const width = 800;
    const pad = { top: 24, right: 18, bottom: 34, left: 54 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const allValues = series.flatMap((item) => item.values.map(Number));
    const max = Math.max(...allValues, 1);
    const min = Math.min(...allValues, 0);
    const range = max - min || 1;
    const step = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
    const yFor = (value) => pad.top + plotH - ((value - min) / range) * plotH;
    const grid = [0, 0.25, 0.5, 0.75, 1]
      .map((ratio) => {
        const y = pad.top + plotH * ratio;
        const value = max - range * ratio;
        return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid-line"/>
                <text x="${pad.left - 10}" y="${y + 4}" class="chart-axis" text-anchor="end">${format(value)}${suffix}</text>`;
      })
      .join("");

    const paths = series
      .map((item, seriesIndex) => {
        const color = item.color || colors[seriesIndex % colors.length];
        const points = item.values.map((value, index) => `${pad.left + index * step},${yFor(value)}`);
        const id = nextId("area");
        const area = `${pad.left},${pad.top + plotH} ${points.join(" ")} ${pad.left + (item.values.length - 1) * step},${pad.top + plotH}`;
        const dots = item.values
          .map((value, index) => `<circle cx="${pad.left + index * step}" cy="${yFor(value)}" r="3" fill="${color}" class="chart-dot"><title>${labels[index]}: ${format(value)}${suffix}</title></circle>`)
          .join("");
        return `
          <defs>
            <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity=".22"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${series.length === 1 ? `<polygon points="${area}" fill="url(#${id})"/>` : ""}
          <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="chart-line"/>
          ${dots}`;
      })
      .join("");

    const xLabels = labels
      .map((label, index) => `<text x="${pad.left + index * step}" y="${height - 10}" class="chart-axis" text-anchor="middle">${label}</text>`)
      .join("");

    return `
      <svg class="chart chart--area" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución mensual" preserveAspectRatio="xMidYMid meet">
        ${grid}
        ${paths}
        ${xLabels}
      </svg>`;
  }

  function stackedBars(labels, series, options = {}) {
    const { height = 300, format = compact, suffix = "" } = options;
    const width = 800;
    const pad = { top: 24, right: 16, bottom: 38, left: 54 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const totals = labels.map((_, index) => series.reduce((sum, item) => sum + Number(item.values[index] || 0), 0));
    const max = Math.max(...totals, 1);
    const slot = plotW / labels.length;
    const barW = Math.min(slot * 0.52, 54);
    const grid = [0, 0.25, 0.5, 0.75, 1]
      .map((ratio) => {
        const y = pad.top + plotH * ratio;
        return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid-line"/>
                <text x="${pad.left - 10}" y="${y + 4}" class="chart-axis" text-anchor="end">${format(max * (1 - ratio))}${suffix}</text>`;
      })
      .join("");

    const bars = labels
      .map((label, index) => {
        let accumulated = 0;
        const x = pad.left + slot * index + (slot - barW) / 2;
        const stack = series
          .map((item) => {
            const value = Number(item.values[index] || 0);
            if (!value) return "";
            const h = (value / max) * plotH;
            const y = pad.top + plotH - accumulated - h;
            accumulated += h;
            return `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h, 0)}" fill="${item.color}" rx="1.5" class="chart-bar" style="--bar-delay:${index * 70}ms">
              <title>${label} · ${item.name}: ${format(value)}${suffix}</title>
            </rect>`;
          })
          .join("");
        return `${stack}<text x="${x + barW / 2}" y="${height - 12}" class="chart-axis" text-anchor="middle">${label}</text>`;
      })
      .join("");

    return `
      <svg class="chart chart--bars" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ingresos por unidad" preserveAspectRatio="xMidYMid meet">
        ${grid}${bars}
      </svg>`;
  }

  function barChart(items, options = {}) {
    const { height = 240, color = "#00e5ff", format = compact, suffix = "", horizontal = true } = options;
    if (horizontal) {
      const width = 800;
      const pad = { top: 12, right: 56, bottom: 12, left: 150 };
      const rowH = Math.max(26, (height - pad.top - pad.bottom) / Math.max(items.length, 1));
      const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
      const rows = items
        .map((item, index) => {
          const y = pad.top + index * rowH;
          const barMax = width - pad.left - pad.right;
          const w = Math.max(2, (Number(item.value || 0) / max) * barMax);
          return `
            <text x="${pad.left - 12}" y="${y + rowH / 2 + 4}" text-anchor="end" class="chart-label">${item.label}</text>
            <rect x="${pad.left}" y="${y + rowH * 0.22}" width="${barMax}" height="${rowH * 0.42}" fill="rgba(255,255,255,.035)" rx="2"/>
            <rect x="${pad.left}" y="${y + rowH * 0.22}" width="${w}" height="${rowH * 0.42}" fill="${item.color || color}" rx="2" class="chart-bar-h" style="--bar-delay:${index * 55}ms">
              <title>${item.label}: ${format(item.value)}${suffix}</title>
            </rect>
            <text x="${width - pad.right + 8}" y="${y + rowH / 2 + 4}" class="chart-axis">${item.display || format(item.value) + suffix}</text>`;
        })
        .join("");
      return `<svg class="chart chart--hbars" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.label || "Comparativa"}" preserveAspectRatio="xMidYMid meet">${rows}</svg>`;
    }
    const width = 640;
    const pad = { top: 20, right: 12, bottom: 34, left: 12 };
    const plotH = height - pad.top - pad.bottom;
    const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
    const slot = (width - pad.left - pad.right) / Math.max(items.length, 1);
    const barW = Math.min(slot * 0.52, 46);
    const bars = items
      .map((item, index) => {
        const h = (Number(item.value || 0) / max) * plotH;
        const x = pad.left + slot * index + (slot - barW) / 2;
        return `<rect x="${x}" y="${pad.top + plotH - h}" width="${barW}" height="${h}" fill="${item.color || color}" rx="2" class="chart-bar" style="--bar-delay:${index * 60}ms"><title>${item.label}: ${item.display || format(item.value)}</title></rect>
          <text x="${x + barW / 2}" y="${height - 12}" class="chart-axis" text-anchor="middle">${item.label}</text>`;
      })
      .join("");
    return `<svg class="chart chart--vbars" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.label || "Comparativa"}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
  }

  function donut(segments, options = {}) {
    const { size = 176, thickness = 14, center = "", sub = "", gap = 2 } = options;
    const total = segments.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const circles = segments
      .map((item, index) => {
        const ratio = Number(item.value || 0) / total;
        const dash = Math.max(ratio * circumference - gap, 0.5);
        const circle = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${item.color}" stroke-width="${thickness}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})" class="donut-segment" style="--donut-delay:${index * 90}ms"><title>${item.label}: ${item.display || Math.round(ratio * 100) + "%"}</title></circle>`;
        offset += ratio * circumference;
        return circle;
      })
      .join("");
    return `
      <div class="donut" style="--donut-size:${size}px">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${options.label || "Distribución"}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="${thickness}"/>
          ${circles}
        </svg>
        <div class="donut-center">
          <strong>${center}</strong>
          <span>${sub}</span>
        </div>
      </div>`;
  }

  function ring(pct, options = {}) {
    const { size = 88, thickness = 6, color = "#00e5ff", label = "" } = options;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const value = Math.max(0, Math.min(100, Number(pct || 0)));
    const dash = (value / 100) * circumference;
    return `
      <div class="progress-ring" style="--ring-size:${size}px;--ring-color:${color}">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${thickness}"/>
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round"
            stroke-dasharray="${dash} ${circumference}" stroke-dashoffset="0" transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-progress"/>
        </svg>
        <div class="progress-ring-text"><strong>${Math.round(value)}%</strong>${label ? `<span>${label}</span>` : ""}</div>
      </div>`;
  }

  function miniBars(values, options = {}) {
    const { color = "#00e5ff", width = 116, height = 34 } = options;
    const max = Math.max(...values, 1);
    const gap = 3;
    const barW = (width - gap * (values.length - 1)) / values.length;
    const bars = values
      .map((value, index) => {
        const h = Math.max(2, (value / max) * height);
        return `<rect x="${index * (barW + gap)}" y="${height - h}" width="${barW}" height="${h}" rx="1" fill="${color}" opacity="${0.35 + (index / values.length) * 0.65}"/>`;
      })
      .join("");
    return `<svg class="mini-bars" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${bars}</svg>`;
  }

  window.MasivoCharts = { spark, areaChart, stackedBars, barChart, donut, ring, miniBars, compact };
})();
