lucide.createIcons();

// Configuration des coûts estimés par l'IA pour chaque point KO
const inspectionConfig = [
    { name: "Carte Grise", cost: 0, cat: "Admin" },
    { name: "Contrôle Technique", cost: 120, cat: "Admin" },
    { name: "Histovec", cost: 0, cat: "Admin" },
    { name: "Non-gage", cost: 0, cat: "Admin" },
    { name: "Factures d'entretien", cost: 200, cat: "Admin" },
    { name: "Alignement carrosserie", cost: 400, cat: "Ext" },
    { name: "État peinture", cost: 300, cat: "Ext" },
    { name: "Pneus & Freins", cost: 250, cat: "Ext" },
    { name: "Optiques/Phares", cost: 150, cat: "Ext" },
    { name: "Jantes/Rayures", cost: 200, cat: "Ext" },
    { name: "Niveau Huile", cost: 100, cat: "Meca" },
    { name: "Bruit Turbo", cost: 1200, cat: "Meca" },
    { name: "Embrayage", cost: 800, cat: "Meca" },
    { name: "Courroie (date)", cost: 600, cat: "Meca" },
    { name: "Joint de culasse", cost: 1500, cat: "Meca" },
    { name: "Fuites moteur", cost: 400, cat: "Meca" },
    { name: "Climatisation", cost: 500, cat: "Int" },
    { name: "État sièges/volant", cost: 250, cat: "Int" },
    { name: "Voyants tableau bord", cost: 300, cat: "Int" },
    { name: "Électronique/GPS", cost: 400, cat: "Int" },
    { name: "Démarrage à froid", cost: 200, cat: "Essai" },
    { name: "Passage des vitesses", cost: 1000, cat: "Essai" },
    { name: "Fumées échappement", cost: 600, cat: "Essai" },
    { name: "Bruit roulement", cost: 150, cat: "Essai" },
    { name: "Précision direction", cost: 350, cat: "Essai" },
    { name: "Freinage urgence", cost: 200, cat: "Essai" },
    { name: "Ralenti stable", cost: 150, cat: "Essai" }
];

let checks = {};
let savedDeals = JSON.parse(localStorage.getItem('ox_history')) || [];

function initApp() {
    const container = document.getElementById('checklist-render');
    if (container) {
        container.innerHTML = "";
        inspectionConfig.forEach(pt => {
            const div = document.createElement('div');
            div.className = "check-item";
            div.innerHTML = `
                <span><small>${pt.cat}</small><br>${pt.name}</span>
                <div class="pill-group">
                    <button class="pill-btn btn-ok" onclick="handleCheck('${pt.name}', 1, this)">OK</button>
                    <button class="pill-btn btn-ko" onclick="handleCheck('${pt.name}', 0, this)">KO</button>
                </div>`;
            container.appendChild(div);
        });
    }
    renderDashboard();
}

function handleCheck(name, val, btn) {
    checks[name] = val;
    btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    runCalculations();
}

function runCalculations() {
    const market = parseFloat(document.getElementById('market-val').value) || 0;
    const buyPrice = parseFloat(document.getElementById('target-price').value) || 0;
    const fees = parseFloat(document.getElementById('fees-admin').value) || 0;
    
    // L'IA calcule les frais selon les KO cochés
    let iaEstimatedRepairs = 0;
    inspectionConfig.forEach(pt => {
        if (checks[pt.name] === 0) {
            iaEstimatedRepairs += pt.cost;
        }
    });

    // Mise à jour de l'input frais (lecture seule pour montrer l'action de l'IA)
    document.getElementById('repairs').value = iaEstimatedRepairs;
    document.getElementById('flash-repairs').innerText = iaEstimatedRepairs + " €";

    const totalInvest = buyPrice + iaEstimatedRepairs + fees;
    const margeNet = market - totalInvest;
    const roi = totalInvest > 0 ? (margeNet / totalInvest) * 100 : 0;
    
    // Score IA
    const kos = Object.values(checks).filter(v => v === 0).length;
    const score = Math.max(0, 100 - (kos * 4));

    // Affichage des résultats
    document.getElementById('marge-val').innerText = Math.round(margeNet).toLocaleString();
    document.getElementById('flash-marge').innerText = Math.round(margeNet) + " €";
    document.getElementById('flash-score').innerText = Math.round(score) + "/100";
    document.getElementById('roi-val').innerText = Math.round(roi);
    document.getElementById('confidence-level').style.width = score + "%";

    // Avis de l'IA
    const verdict = document.getElementById('ia-verdict');
    if (margeNet <= 0) {
        verdict.innerText = "❌ PERTE DÉTECTÉE - NE PAS ACHETER";
        verdict.style.color = "#ef4444";
    } else if (score < 60) {
        verdict.innerText = "⚠️ TROP DE DÉFAUTS - RISQUÉ";
        verdict.style.color = "#fb923c";
    } else if (margeNet > 2000 && roi > 20) {
        verdict.innerText = "🔥 EXCELLENTE AFFAIRE";
        verdict.style.color = "#22c55e";
    } else {
        verdict.innerText = "✅ ACHAT POSSIBLE";
        verdict.style.color = "#6366f1";
    }

    // Conseil d'achat max pour garder 1000€ de marge min
    const adviceMax = market - iaEstimatedRepairs - fees - 1000;
    document.getElementById('ia-advice').innerText = Math.max(0, Math.round(adviceMax)).toLocaleString() + " €";

    // Mise à jour Ackermann avec le prix d'achat actuel
    const ackSteps = [0.65, 0.85, 0.95, 1];
    const timeline = document.getElementById('ackermann-timeline');
    if(timeline) {
        timeline.innerHTML = ackSteps.map(s => `
            <div class="card"><small>${Math.round(s*100)}%</small><h2>${Math.round(buyPrice * s)}€</h2></div>
        `).join('');
    }
}

// Les fonctions saveCurrentDeal, renderDashboard, openRecap restent identiques mais utilisent le nouveau calcul
function saveCurrentDeal() {
    const model = document.getElementById('model-name').value;
    if(!model) return alert("Indique le modèle !");
    const deal = {
        model,
        vendeur: document.getElementById('v-name').value || "Inconnu",
        phone: document.getElementById('v-phone').value || "N/A",
        marge: document.getElementById('marge-val').innerText,
        roi: document.getElementById('roi-val').innerText,
        status: document.getElementById('buy-status').value,
        repairs: document.getElementById('repairs').value,
        verdict: document.getElementById('ia-verdict').innerText,
        date: new Date().toLocaleDateString()
    };
    savedDeals.unshift(deal);
    localStorage.setItem('ox_history', JSON.stringify(savedDeals));
    renderDashboard();
    alert("Dossier enregistré !");
}

function renderDashboard() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = savedDeals.map((d, i) => `
        <div class="card" onclick="openRecap(${i})" style="cursor:pointer; border-left: 6px solid ${d.status === 'ACHETÉ' ? '#22c55e' : '#fb923c'}">
            <b>${d.model}</b><br>
            <span style="color:#22c55e; font-weight:800">+ ${d.marge} €</span><br>
            <small>${d.date} | ${d.status}</small>
        </div>
    `).join('');
}

function openRecap(i) {
    const d = savedDeals[i];
    document.getElementById('recap-model').innerText = d.model;
    document.getElementById('recap-vendeur').innerText = d.vendeur;
    document.getElementById('recap-phone').innerText = d.phone;
    document.getElementById('recap-marge').innerText = d.marge + " €";
    document.getElementById('recap-roi-display').innerText = d.roi + "%";
    document.getElementById('recap-riposte').innerText = d.repairs > 0 
        ? `L'IA a détecté ${d.repairs}€ de frais. Utilisez cet argument pour descendre le prix vers ${document.getElementById('ia-advice').innerText}.`
        : "Véhicule propre selon l'inspection. Jouez sur le paiement immédiat.";
    
    document.getElementById('delete-btn').onclick = () => {
        if(confirm("Supprimer ?")) { savedDeals.splice(i,1); localStorage.setItem('ox_history', JSON.stringify(savedDeals)); renderDashboard(); closeRecap(); }
    };
    document.getElementById('recap-modal').style.display = "block";
}

function closeRecap() { document.getElementById('recap-modal').style.display = "none"; }
function switchTab(id, btn) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');
}
function copyAd() {
    const text = document.getElementById('ad-output');
    text.select();
    navigator.clipboard.writeText(text.value);
    alert("Copié !");
}

window.onload = initApp;