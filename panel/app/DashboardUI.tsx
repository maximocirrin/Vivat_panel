"use client";

import React, { useState } from "react";
import {
  Users,
  Home,
  FileCheck,
  CreditCard,
  Eye,
  FileText,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// --- COMPONENTES ---

function KpiCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="glass-panel kpi-card">
      <div className="kpi-title">
        <Icon size={18} color="var(--accent-primary)" />
        {title}
      </div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function RevenueCalculator({ passportsSold }: { passportsSold: number }) {
  const PRECIO_PASAPORTE = 15000; // Ejemplo de precio unitario en ARS
  const [costoMarketing, setCostoMarketing] = useState(50000);
  const [costoOperativo, setCostoOperativo] = useState(100000);

  const ingresos = passportsSold * PRECIO_PASAPORTE;
  const costosTotales = costoMarketing + costoOperativo;
  const ganancia = ingresos - costosTotales;

  return (
    <div className="glass-panel" style={{ marginTop: "32px" }}>
      <h2 className="section-title">Calculadora de Rentabilidad (Pasaportes)</h2>
      <div className="calc-container">
        <div>
          <div className="input-group">
            <label>Precio del Pasaporte (Ingreso por unidad)</label>
            <input type="text" value={`$${PRECIO_PASAPORTE.toLocaleString()}`} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="input-group">
            <label>Costo de Marketing ($)</label>
            <input 
              type="number" 
              value={costoMarketing} 
              onChange={(e) => setCostoMarketing(Number(e.target.value))} 
            />
          </div>
          <div className="input-group">
            <label>Otros Costos Operativos ($)</label>
            <input 
              type="number" 
              value={costoOperativo} 
              onChange={(e) => setCostoOperativo(Number(e.target.value))} 
            />
          </div>
          <div style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
            <strong>Ingresos Estimados:</strong> ${ingresos.toLocaleString()} ({passportsSold} pasaportes vendidos)
          </div>
        </div>
        
        <div className={`profit-result ${ganancia < 0 ? 'negative' : ''}`}>
          <div className="profit-result-label">Ganancia Neta</div>
          <div className="profit-result-value">
            ${ganancia.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---

export type KpiData = {
  perfilesCreados: number;
  perfilesConPropiedades: number;
  perfilesConPostulaciones: number;
  publicacionesTotales: number;
  pasaportesPagados: number;
  contratosActivos: number;
  visitas: number;
  clickPostularme: number;
};

export default function DashboardUI({ data }: { data: KpiData }) {
  const conversionRate = data.clickPostularme > 0 
    ? ((data.pasaportesPagados / data.clickPostularme) * 100).toFixed(1)
    : "0.0";

  // TODO: Obtener datos de evolución reales
  const mockEvolutionData = [
    { name: "Ene", usuarios: 40, publicaciones: 24 },
    { name: "Feb", usuarios: 55, publicaciones: 35 },
    { name: "Mar", usuarios: 80, publicaciones: 50 },
    { name: "Abr", usuarios: 120, publicaciones: 80 },
    { name: "May", usuarios: 156, publicaciones: 210 },
  ];

  const funnelData = [
    { name: "Visitas", cantidad: data.visitas },
    { name: "Clic 'Postularme'", cantidad: data.clickPostularme },
    { name: "Compró Pasaporte", cantidad: data.pasaportesPagados },
  ];

  return (
    <main style={{ padding: "40px 5%" }}>
      <div className="dashboard-header">
        <h1>Vivat Panel</h1>
        <p>Métricas y Estadísticas Generales (En vivo)</p>
      </div>

      <h2 className="section-title">Indicadores Clave (KPIs)</h2>
      <div className="dashboard-grid">
        <KpiCard title="Perfiles Creados" value={data.perfilesCreados} icon={Users} />
        <KpiCard title="Publicaciones Totales" value={data.publicacionesTotales} icon={Home} />
        <KpiCard title="Contratos Activos" value={data.contratosActivos} icon={FileText} />
        <KpiCard title="Pasaportes Pagados" value={data.pasaportesPagados} icon={CreditCard} />
        
        <KpiCard title="Perfiles con Publicaciones" value={data.perfilesConPropiedades} icon={FileCheck} />
        <KpiCard title="Perfiles con Postulaciones" value={data.perfilesConPostulaciones} icon={TrendingUp} />
        
        <KpiCard title="Visitas a la página (Mock GA)" value={data.visitas.toLocaleString()} icon={Eye} />
        <KpiCard title="Tasa Conversión (Pasaporte)" value={`${conversionRate}%`} icon={MousePointerClick} />
      </div>

      <RevenueCalculator passportsSold={data.pasaportesPagados} />

      <div className="dashboard-grid" style={{ marginTop: "32px", gridTemplateColumns: "1fr 1fr" }}>
        {/* Gráfico de Evolución */}
        <div className="glass-panel">
          <h2 className="section-title">Evolución de Plataforma (Demo)</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--surface-border)' }}
                />
                <Line type="monotone" dataKey="usuarios" stroke="var(--accent-primary)" strokeWidth={3} />
                <Line type="monotone" dataKey="publicaciones" stroke="var(--accent-secondary)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Embudo */}
        <div className="glass-panel">
          <h2 className="section-title">Embudo de Conversión</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis type="number" stroke="var(--text-secondary)" />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={120} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--surface-border)' }}
                />
                <Bar dataKey="cantidad" fill="var(--accent-success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
