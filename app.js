const monthInput = document.getElementById("monthInput");
const kwhInput = document.getElementById("kwhInput");
const costInput = document.getElementById("costInput");
const interpXInput = document.getElementById("interpX");
const dataForm = document.getElementById("dataForm");
const dataTable = document.getElementById("dataTable");
const resultOutput = document.getElementById("resultOutput");
const toast = document.getElementById("toast");

let energyChart;
let data = [];

function formatCurrency(value) {

    if (currentLanguage === "id") {
        return "Rp" + Number(value).toLocaleString("id-ID");
    }

    return "IDR " + Number(value).toLocaleString("en-US");
}

let currentLanguage =localStorage.getItem("language") || "id";

const months = {
    id: [
        "Januari","Februari","Maret","April",
        "Mei","Juni","Juli","Agustus",
        "September","Oktober","November","Desember"
    ],

    en: [
        "January","February","March","April",
        "May","June","July","August",
        "September","October","November","December"
    ]
};

/*
function updateMonthOptions(lang) {
    ...
}
*/

function resetData() {
    data = [];
    render();
    showToast(translations[currentLanguage].dataReset);
}

function loadSampleData() {
    const sampleMonths = months[currentLanguage];

    data = [
        { month: sampleMonths[0], kwh: 210, cost: 315000 },
        { month: sampleMonths[1], kwh: 230, cost: 345000 },
        { month: sampleMonths[2], kwh: 250, cost: 375000 },
        { month: sampleMonths[3], kwh: 270, cost: 405000 },
        { month: sampleMonths[4], kwh: 300, cost: 450000 }
    ];
    
    interpXInput.value = "2.5";
    render();
    showToast(translations[currentLanguage].sampleLoaded);
}

function deleteRow(index) {
    data.splice(index, 1);
    render();
    showToast(translations[currentLanguage].dataDeleted);
}

dataForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const month = monthInput.value;
    const kwh = Number(kwhInput.value);
    const cost = Number(costInput.value);

    if (!month || kwh <= 0 || cost <= 0) {
        showToast(translations[currentLanguage].invalidInput);
        return;
    }

    if (data.some(item => item.month === month)) {
        showToast(
            currentLanguage === "id"
                ? "Data bulan tersebut sudah ada."
                : "This month already exists."
        );
        return;
    }

    data.push({
        month,
        kwh,
        cost
    });

    monthInput.value = "";
    kwhInput.value = "";
    costInput.value = "";

    render();
    showToast(translations[currentLanguage].dataAdded);
});

function render() {
    const calculations = calculateAll();
    renderStats(calculations);
    renderTable();
    renderResult(calculations);
    renderChart(calculations);
}

function calculateAll() {
    const xValues = data.map((_, index) => index + 1);
    const yValues = data.map((item) => item.kwh);
    const interpolationX = Number(interpXInput.value);
    const interpolation = calculateInterpolation(xValues, yValues, interpolationX);
    const regression = calculateRegression(xValues, yValues);
    const nextX = data.length + 1;
    const prediction = regression ? regression.a + regression.b * nextX : 0;

    return { xValues, yValues, interpolationX, interpolation, regression, nextX, prediction };
}

function calculateInterpolation(xValues, yValues, targetX) {
    if (data.length < 2 || !Number.isFinite(targetX)) {
        return null;
    }

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    if (targetX < minX || targetX > maxX) {
        return {error: translations[currentLanguage].interpolationError};
    }

    let rightIndex = xValues.findIndex((x) => x >= targetX);
    if (rightIndex === 0) {
        rightIndex = 1;
    }

    const leftIndex = rightIndex - 1;
    const x1 = xValues[leftIndex];
    const y1 = yValues[leftIndex];
    const x2 = xValues[rightIndex];
    const y2 = yValues[rightIndex];
    const y = y1 + ((targetX - x1) / (x2 - x1)) * (y2 - y1);

    return { x1, y1, x2, y2, y };
}

function calculateRegression(xValues, yValues) {
    const n = data.length;
    if (n < 2) {
        return null;
    }

    const sumX = xValues.reduce((sum, value) => sum + value, 0);
    const sumY = yValues.reduce((sum, value) => sum + value, 0);
    const sumXY = xValues.reduce((sum, x, index) => sum + x * yValues[index], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const denominator = n * sumX2 - sumX * sumX;

    if (denominator === 0) {
        return null;
    }

    const b = (n * sumXY - sumX * sumY) / denominator;
    const a = (sumY - b * sumX) / n;
    // Hitung R²
    const meanY = sumY / n;
    
    const ssTotal = yValues.reduce(
        (sum, y) => sum + Math.pow(y - meanY, 2),
        0
    );
    
    const ssResidual = yValues.reduce((sum, y, index) => {
        const predicted = a + b * xValues[index];
        return sum + Math.pow(y - predicted, 2);
    }, 0);
    
    const r2 = ssTotal === 0
        ? 1
        : 1 - (ssResidual / ssTotal);
    return { n, sumX, sumY, sumXY, sumX2, a, b, r2 };
}

function renderStats({ regression, prediction }) {
    const totalKwh = data.reduce((sum, item) => sum + item.kwh, 0);
    const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
    const avg = data.length ? totalKwh / data.length : 0;

    document.getElementById("totalData").textContent = data.length;
    document.getElementById("avgKwh").textContent = `${avg.toFixed(1)} kWh`;
    document.getElementById("totalCost").textContent = formatCurrency(totalCost);
    document.getElementById("trendValue").textContent = regression ? `${regression.b.toFixed(2)} ${translations[currentLanguage].monthUnit}` : "0";
    document.getElementById("heroPrediction").textContent = `${prediction.toFixed(1)} kWh`;
}

function renderTable() {
    if (!data.length) {
        dataTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    ${translations[currentLanguage].noDataTable}
                </td>
            </tr>`;
        return;
    }

    dataTable.innerHTML = data.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.month)}</td>
            <td>${item.kwh.toFixed(2)}</td>
            <td>${formatCurrency(item.cost)}</td>
            <td><button class="delete-btn" onclick="deleteRow(${index})" title="Hapus"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join("");
}

function renderResult({ interpolation, interpolationX, regression, nextX, prediction }) {
    if (data.length < 2) {
        resultOutput.innerHTML =`<div class="step">${translations[currentLanguage].noDataMsg}</div>`;
        return;
    }

    const interpolationHtml = interpolation?.error
        ? `<div class="step">${interpolation.error}</div>`
        : `
            <div class="step">
                <strong>${translations[currentLanguage].interpolationTitle}</strong>
                ${translations[currentLanguage].knownX} = ${interpolationX},
                ${translations[currentLanguage].nearestPoint}
                (${interpolation.x1}, ${interpolation.y1})
                ${translations[currentLanguage].andWord}
                (${interpolation.x2}, ${interpolation.y2})<br>
                <strong>${translations[currentLanguage].interpolationResult} = ${interpolation.y.toFixed(2)} kWh</strong>
            </div>
        `;

    const regressionHtml = regression
        ? `
            <div class="step">
                <strong>${translations[currentLanguage].regressionTitle}</strong>
                n = ${regression.n}, Σx = ${regression.sumX.toFixed(2)}, Σy = ${regression.sumY.toFixed(2)},
                Σxy = ${regression.sumXY.toFixed(2)}, Σx² = ${regression.sumX2.toFixed(2)}<br>
                b = (${regression.n}(${regression.sumXY.toFixed(2)}) - (${regression.sumX.toFixed(2)})(${regression.sumY.toFixed(2)})) /
                (${regression.n}(${regression.sumX2.toFixed(2)}) - (${regression.sumX.toFixed(2)})²)<br>
                a = (Σy - bΣx) / n<br>
                <strong>a = ${regression.a.toFixed(4)}, b = ${regression.b.toFixed(4)}</strong><br>
                ${translations[currentLanguage].equation}: <strong>y = ${regression.a.toFixed(4)} + ${regression.b.toFixed(4)}x</strong><br>
                <br>R² = <strong>${regression.r2.toFixed(4)}</strong><br>
                ${translations[currentLanguage].prediction} ${nextX}: <strong>${prediction.toFixed(2)} kWh</strong>
            </div>
            <div class="step">
                <strong>${translations[currentLanguage].conclusionTitle}</strong>
                <br><br> R² = <strong>${(regression.r2*100).toFixed(2)}%</strong> 
                ${translations[currentLanguage].r2Explanation}
                <strong>${(regression.r2*100).toFixed(2)}%</strong>
                ${translations[currentLanguage].variationText}
                
                ${translations[currentLanguage].conclusionText} ${regression.b >= 0
                                                                  ? translations[currentLanguage].increase
                                                                  : translations[currentLanguage].decrease}
                ${Math.abs(regression.b).toFixed(2)} ${translations[currentLanguage].everyMonth}
                <br><br>
                ${translations[currentLanguage].estimateText} <strong>${prediction.toFixed(2)} kWh.</strong>
            </div>
        `
        : "";

    resultOutput.innerHTML = interpolationHtml + regressionHtml;
}

function renderChart({ interpolation, interpolationX, regression, nextX, prediction }) {
    const labels = data.map((item) => item.month);
    const actualValues = data.map((item) => item.kwh);
    const regressionValues = data.map((_, index) => regression ? regression.a + regression.b * (index + 1) : null);

    const extendedLabels = [...labels,`${translations[currentLanguage].predictionMonth} ${nextX}`];
    const actualSeries = [...actualValues, null];
    const regressionSeries = [...regressionValues, prediction || null];
    const interpolationSeries = new Array(extendedLabels.length).fill(null);

    if (interpolation && !interpolation.error) {
        interpolationSeries[Math.max(0, Math.round(interpolationX) - 1)] = interpolation.y;
    }

    const textColor = getComputedStyle(document.body).getPropertyValue("--text").trim();
    const mutedColor = getComputedStyle(document.body).getPropertyValue("--muted").trim();

    if (!energyChart) {
        const context = document.getElementById("energyChart");
        energyChart = new Chart(context, {
            type: "line",
            data: {
                labels: extendedLabels,
                datasets: [
                    {
                        label: translations[currentLanguage].chartActual,
                        data: actualSeries,
                        borderColor: "#19d7ff",
                        backgroundColor: "rgba(25, 215, 255, 0.16)",
                        tension: 0.35,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 5
                    },
                    {
                        label: translations[currentLanguage].chartRegression,
                        data: regressionSeries,
                        borderColor: "#32e6a7",
                        borderDash: [8, 6],
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 5
                    },
                    {
                        label: translations[currentLanguage].chartInterpolation,
                        data: interpolationSeries,
                        borderColor: "#ffcf5a",
                        pointBackgroundColor: "#ffcf5a",
                        pointRadius: 5,
                        pointHoverRadius: 6,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 250
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: mutedColor },
                        grid: { color: "rgba(145, 168, 186, 0.12)" }
                    },
                    y: {
                        ticks: { color: mutedColor },
                        grid: { color: "rgba(145, 168, 186, 0.12)" }
                    }
                }
            }
        });
        return;
    }

    energyChart.data.labels = extendedLabels;
    energyChart.data.datasets[0].data = actualSeries;
    energyChart.data.datasets[1].data = regressionSeries;
    energyChart.data.datasets[2].data = interpolationSeries;
    energyChart.options.plugins.legend.labels.color = textColor;
    energyChart.options.scales.x.ticks.color = mutedColor;
    energyChart.options.scales.y.ticks.color = mutedColor;
    energyChart.update("none");
}

function exportExcel() {
    if (!data.length) {
        showToast(translations[currentLanguage].noExportData);
        return;
    }

    const calculations = calculateAll();

    const rows = data.map((item, index) => ({
    x: index + 1,
    [currentLanguage === "id" ? "Bulan" : "Month"]: item.month,
    kWh: item.kwh,
    [currentLanguage === "id" ? "Biaya" : "Cost"]: item.cost
    }));

    // Baris kosong
    rows.push({});

    // Hasil Interpolasi
    if (calculations.interpolation && !calculations.interpolation.error) {
        rows.push({
            x: "",
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id"? "Hasil Interpolasi": "Interpolation Result",
            kWh: calculations.interpolation.y.toFixed(2),
            Biaya: ""
        });
    }

    // Persamaan Regresi
    if (calculations.regression) {
        rows.push({
            x: "",
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id"? "Persamaan Regresi": "Regression Equation",
            kWh: `y = ${calculations.regression.a.toFixed(4)} + ${calculations.regression.b.toFixed(4)}x`,
            Biaya: ""
        });

        // Prediksi
        rows.push({
            x: calculations.nextX,
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id"? "Prediksi Bulan Berikutnya": "Next Month Prediction",
            kWh: calculations.prediction.toFixed(2),
            Biaya: ""
        });

        rows.push({
            x: "",
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id" ? "Koefisien Determinasi (R²)" : "Coefficient of Determination (R²)",
            kWh: calculations.regression.r2.toFixed(4),
            Biaya: ""
        });
        
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom otomatis
    worksheet["!cols"] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 30 },
        { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,currentLanguage === "id"? "Konsumsi Listrik": "Electricity Consumption"
    );

    XLSX.writeFile(workbook,currentLanguage === "id"? "laporan-konsumsi-listrik.xlsx": "electricity-consumption-report.xlsx"
    );

    showToast(currentLanguage === "id"? "File Excel berhasil dibuat.": "Excel file created successfully."
    );
}
function downloadPdf() {

    if (!data.length) {
        showToast(translations[currentLanguage].noPdfData);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const calculations = calculateAll();
    const regression = calculations.regression;

    const totalKwh = data.reduce((s, d) => s + d.kwh, 0);
    const totalCost = data.reduce((s, d) => s + d.cost, 0);
    const avgKwh = totalKwh / data.length;

    const prediction = calculations.prediction || 0;

    const firstMonth = data[0]?.month || "-";
    const lastMonth = data[data.length - 1]?.month || "-";

    let y = 20;

    // ==================================
    // HEADER
    // ==================================

    doc.setFillColor(24, 119, 242);
    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, "bold");
    doc.text("⚡ VOLTNOTE", 14, 15);

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(
        "Laporan Analisis Konsumsi Listrik",
        14,
        23
    );

    doc.setTextColor(0, 0, 0);

    y = 42;

    doc.setFontSize(10);

    doc.text(
        `Periode Analisis : ${firstMonth} - ${lastMonth}`,
        14,
        y
    );

    y += 6;

    doc.text(
        `Dibuat Pada : ${new Date().toLocaleString("id-ID")}`,
        14,
        y
    );

    // ==================================
    // RINGKASAN
    // ==================================

    y += 10;

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, y, 182, 38, 3, 3, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("RINGKASAN ANALISIS", 20, y + 8);

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    doc.text("Total Data", 20, y + 18);
    doc.text(String(data.length), 65, y + 18);

    doc.text("Rata-rata kWh", 20, y + 28);
    doc.text(avgKwh.toFixed(2) + " kWh", 65, y + 28);

    doc.text("Total Biaya", 110, y + 18);
    doc.text(formatCurrency(totalCost), 145, y + 18);

    doc.text("Prediksi", 110, y + 28);
    doc.text(prediction.toFixed(2) + " kWh", 145, y + 28);

    y += 55;

    // ==================================
    // INTERPOLASI
    // ==================================

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text("Analisis Interpolasi Linear", 14, y);

    y += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (
        calculations.interpolation &&
        !calculations.interpolation.error
    ) {

        const i = calculations.interpolation;

        doc.text(
            `Nilai X Interpolasi : ${calculations.interpolationX}`,
            14,
            y
        );

        y += 6;

        doc.text(
            `Titik Referensi : (${i.x1}, ${i.y1}) dan (${i.x2}, ${i.y2})`,
            14,
            y
        );

        y += 6;

        doc.text(
            `Hasil Interpolasi : ${i.y.toFixed(2)} kWh`,
            14,
            y
        );

    } else {

        doc.text(
            "Data interpolasi belum tersedia.",
            14,
            y
        );
    }

    // ==================================
    // REGRESI
    // ==================================

    y += 15;

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text("Analisis Regresi Linear", 14, y);

    y += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (regression) {

        doc.text(
            `Persamaan : y = ${regression.a.toFixed(4)} + ${regression.b.toFixed(4)}x`,
            14,
            y
        );

        y += 6;

        doc.text(
            `Koefisien Determinasi (R²) : ${(regression.r2 * 100).toFixed(2)}%`,
            14,
            y
        );

        y += 6;

        doc.text(
            `Prediksi Bulan Ke-${calculations.nextX} : ${prediction.toFixed(2)} kWh`,
            14,
            y
        );
    }

    // ==================================
    // DATA KONSUMSI
    // ==================================

    y += 15;

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text("Data Konsumsi Listrik", 14, y);

    y += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    data.forEach((item, index) => {

        doc.text(`${index + 1}`, 18, y);
        doc.text(item.month, 30, y);
        doc.text(item.kwh.toFixed(2) + " kWh", 90, y);
        doc.text(formatCurrency(item.cost), 140, y);

        y += 6;

        if (y > 250) {
            doc.addPage();
            y = 20;
        }

    });

    // ==================================
    // GRAFIK
    // ==================================

    y += 12;

    if (y > 150) {
        doc.addPage();
        y = 20;
    }

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text("Grafik Dashboard", 14, y);

    y += 8;

    const chartCanvas =
        document.getElementById("energyChart");

    if (chartCanvas) {

        const tempCanvas =
            document.createElement("canvas");

        tempCanvas.width =
            chartCanvas.width;

        tempCanvas.height =
            chartCanvas.height;

        const ctx =
            tempCanvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
        );

        ctx.drawImage(
            chartCanvas,
            0,
            0
        );

        const chartImage =
            tempCanvas.toDataURL(
                "image/png",
                1.0
            );

        doc.addImage(
            chartImage,
            "PNG",
            14,
            y,
            180,
            90
        );

        y += 100;
    }

    // ==================================
    // KESIMPULAN
    // ==================================

    if (y > 220) {
        doc.addPage();
        y = 20;
    }

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text("Kesimpulan", 14, y);

    y += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (regression) {

        const trend =
            regression.b >= 0
                ? "meningkat"
                : "menurun";

        doc.text(
            `Konsumsi listrik menunjukkan tren ${trend}.`,
            14,
            y
        );

        y += 6;

        doc.text(
            `Model regresi menjelaskan ${(regression.r2 * 100).toFixed(2)}% variasi data.`,
            14,
            y
        );

        y += 6;

        doc.text(
            `Estimasi konsumsi bulan berikutnya adalah ${prediction.toFixed(2)} kWh.`,
            14,
            y
        );
    }

    // ==================================
    // REKOMENDASI
    // ==================================

    y += 15;

    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text("Rekomendasi Otomatis", 14, y);

    y += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    doc.text(
        "1. Pantau konsumsi listrik setiap bulan secara rutin.",
        18,
        y
    );

    y += 6;

    doc.text(
        "2. Gunakan hasil prediksi untuk perencanaan biaya listrik.",
        18,
        y
    );

    y += 6;

    doc.text(
        "3. Evaluasi penggunaan listrik jika tren terus meningkat.",
        18,
        y
    );

    // ==================================
    // FOOTER
    // ==================================

    const pageCount =
        doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {

        doc.setPage(i);

        doc.setFillColor(24, 119, 242);
        doc.rect(0, 285, 210, 12, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);

        doc.text(
            `VoltNote • Interpolasi & Regresi Linear • Halaman ${i}/${pageCount}`,
            14,
            292
        );
    }

    doc.save("laporan-konsumsi-listrik.pdf");

    showToast(
        currentLanguage === "id"
            ? "PDF berhasil dibuat."
            : "PDF generated successfully."
    );
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


const translations = {
    id: {
        heroTitle: "Menghitung Konsumsi Listrik Menggunakan Metode Interpolasi dan Regresi",
        heroLead: "Dashboard edukasi untuk memasukkan data bulanan, melihat proses perhitungan, memprediksi konsumsi, dan mengekspor hasil.",

        sidebarDashboard: "Dashboard",
        sidebarInput: "Input",
        sidebarData: "Data",
        sidebarResult: "Hasil",

        predictLabel: "Prediksi bulan berikutnya",

        inputTitle: "Input Data",
        tableTitle: "Tabel Data",
        resultTitle: "Hasil Perhitungan",

        totalDataLabel: "Total Data",
        avgKwhLabel: "Rata-rata kWh",
        totalCostLabel: "Total Biaya",
        trendLabel: "Tren Regresi",

        inputDesc: "Masukkan bulan, kWh, dan biaya listrik",
        
        monthLabel: "Bulan",
        monthPlaceholder: "Pilih Bulan",
        
        kwhLabel: "Pemakaian listrik (kWh)",
        costLabel: "Biaya listrik (Rp)",
        
        addBtn: "Tambah",
        
        interpLabel: "Nilai x Interpolasi",
        calculateBtn: "Hitung",
        
        tableDesc: "Data aktual penggunaan listrik",
        
        resultDesc: "Rumus, langkah, dan kesimpulan otomatis",
        
        noDataMsg: "Masukkan minimal dua data agar interpolasi dan regresi dapat dihitung.",

        interpolationTitle: "Interpolasi Linear",
        regressionTitle: "Regresi Linear",
        conclusionTitle: "Kesimpulan",
        
        nearestPoint: "Diketahui x",
        interpolationResult: "Hasil interpolasi",
        
        equation: "Persamaan",
        prediction: "Prediksi bulan ke",
        
        increase: "meningkat",
        decrease: "menurun",
        
        conclusionText:
        "Berdasarkan data yang dimasukkan, konsumsi listrik cenderung",

        invalidInput:
        "Input belum valid. Periksa bulan, kWh, dan biaya.",
        
        dataAdded:
        "Data berhasil ditambahkan.",
        
        dataDeleted:
        "Data dihapus.",
        
        dataReset:
        "Data berhasil direset.",
        
        sampleLoaded:
        "Contoh data dimuat.",
        
        excelCreated:
        "File Excel berhasil dibuat.",
        
        pdfCreated:
        "File PDF dibuat.",
        
        noExportData:
        "Tidak ada data untuk diekspor.",
        

        chartTitle: "Grafik Konsumsi",
        chartDesc: "Aktual, interpolasi, dan prediksi regresi",

        interpolationError:"Nilai x interpolasi harus berada di antara data aktual.",

        knownX: "Diketahui x",
        nearestPoint: "titik terdekat adalah",
        everyMonth: "kWh setiap bulan.",
        estimateText: "Estimasi konsumsi bulan berikutnya adalah",

        noPdfData:"Tidak ada data untuk PDF.",

        noDataTable:"Belum ada data.",

        chartActual: "Aktual kWh",
        chartRegression: "Regresi & Prediksi",
        chartInterpolation: "Interpolasi",

        predictionMonth: "Prediksi",
        knownX: "Diketahui x",
        nearestPoint: "titik terdekat adalah",
        andWord: "dan",

        r2Explanation:"menunjukkan bahwa model regresi mampu menjelaskan",
        variationText: "variasi konsumsi listrik berdasarkan data yang tersedia.",

         monthUnit: "kWh/bln"

    },

    en: {
        heroTitle: "Electricity Consumption Using Interpolation and Linear Regression",
        heroLead: "Educational dashboard for entering monthly data, viewing calculations, predicting consumption, and exporting results.",

        sidebarDashboard: "Dashboard",
        sidebarInput: "Input",
        sidebarData: "Data",
        sidebarResult: "Results",

        predictLabel: "Next Month Prediction",

        inputTitle: "Input Data",
        tableTitle: "Data Table",
        resultTitle: "Calculation Results",

        totalDataLabel: "Total Data",
        avgKwhLabel: "Average kWh",
        totalCostLabel: "Total Cost",
        trendLabel: "Regression Trend",

        chartDesc: "Actual, interpolation, and regression prediction",

        inputDesc: "Enter month, kWh, and electricity cost",
        
        monthLabel: "Month",
        monthPlaceholder: "Select Month",
        
        kwhLabel: "Electricity Usage (kWh)",
        costLabel: "Electricity Cost (Rp)",
        
        addBtn: "Add",
        
        interpLabel: "Interpolation x Value",
        calculateBtn: "Calculate",
        
        tableDesc: "Actual electricity consumption data",
        
        resultDesc: "Formulas, steps, and automatic conclusions",
        
        noDataMsg: "Enter at least two data points before interpolation and regression can be calculated.",

        interpolationTitle: "Linear Interpolation",
        regressionTitle: "Linear Regression",
        conclusionTitle: "Conclusion",
        
        nearestPoint: "Given x",
        interpolationResult: "Interpolation result",
        
        equation: "Equation",
        prediction: "Prediction for month",
        
        increase: "increasing",
        decrease: "decreasing",
        
        conclusionText:
        "Based on the entered data, electricity consumption tends to be",
        
        estimateText:
        "The estimated electricity consumption for the next month is",

        invalidInput:
        "Invalid input. Please check month, kWh, and cost.",
        
        dataAdded:
        "Data added successfully.",
        
        dataDeleted:
        "Data deleted.",
        
        dataReset:
        "Data reset successfully.",
        
        sampleLoaded:
        "Sample data loaded.",
        
        excelCreated:
        "Excel file created successfully.",
        
        pdfCreated:
        "PDF file created.",
        
        noExportData:
        "No data available for export.",
        
        noPdfData:
        "No data available for PDF.",
        chartTitle: "Consumption Chart",
        chartDesc: "Actual, interpolation, and regression prediction",

        interpolationError:"Interpolation x value must be between actual data points.",

        knownX: "Given x",
        nearestPoint: "nearest points are",
        everyMonth: "kWh per month.",
        estimateText: "The estimated electricity consumption for next month is",

        noPdfData:"No data available for PDF.",

        noDataTable:"No data available.",
    
        chartTitle:"Consumption Chart",

        chartActual: "Actual kWh",
        chartRegression: "Regression & Prediction",
        chartInterpolation: "Interpolation",

        predictionMonth: "Prediction",
        knownX: "Given x",
        nearestPoint: "nearest points are",
        andWord: "and",

        r2Explanation:"shows that the regression model can explain",
        variationText: "of the variation in electricity consumption based on the available data.",

         monthUnit: "kWh/month"
        }
    };

function setLanguage(lang) {

    currentLanguage = lang;

    localStorage.setItem("language", lang);

    Object.keys(translations[lang]).forEach(key => {

        const element = document.getElementById(key);

        if (element) {
            element.textContent = translations[lang][key];
        }

    });

    $('#monthInput').datepicker('destroy');

    $('#monthInput').datepicker({
        format: "MM yyyy",
        minViewMode: 1,
        autoclose: true,
        language: lang
    });
    
    render(); // tambahkan ini

}

const idBtn = document.getElementById("idBtn");
const enBtn = document.getElementById("enBtn");

idBtn.addEventListener("click", () => {

    setLanguage("id");

    idBtn.classList.add("active");
    enBtn.classList.remove("active");

});

enBtn.addEventListener("click", () => {

    setLanguage("en");

    enBtn.classList.add("active");
    idBtn.classList.remove("active");

});

window.addEventListener("DOMContentLoaded", () => {

    setLanguage(currentLanguage);

    if (currentLanguage === "id") {
        idBtn.classList.add("active");
    } else {
        enBtn.classList.add("active");
    }

    render();

});

$(document).ready(function () {
    $('#monthInput').datepicker({
        format: "MM yyyy",
        minViewMode: 1,
        autoclose: true,
        language: currentLanguage
    });
});

window.addEventListener("load", () => {
    const loader = document.getElementById("loader");

    setTimeout(() => {
        loader.classList.add("hidden");
    }, 1000);
});

document
    .getElementById("sampleBtn")
    .addEventListener("click", loadSampleData);

document
    .getElementById("resetBtn")
    .addEventListener("click", resetData);

document
    .getElementById("calculateBtnAction")
    .addEventListener("click", render);

document
    .getElementById("excelBtn")
    .addEventListener("click", exportExcel);

document
    .getElementById("pdfBtn")
    .addEventListener("click", downloadPdf);

// ======================
// DARK MODE
// ======================

const themeBtn = document.getElementById("themeBtn");

if (themeBtn) {

    const savedTheme =
        localStorage.getItem("theme") || "dark";

    // saat halaman dibuka
    if (savedTheme === "light") {
        document.body.classList.add("light");
    }

    themeBtn.addEventListener("click", () => {

        document.body.classList.toggle("light");

        const currentTheme =
            document.body.classList.contains("light")
                ? "light"
                : "dark";

        localStorage.setItem(
            "theme",
            currentTheme
        );

        render();
    });
}
