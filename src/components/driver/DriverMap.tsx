"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import { vehicleGlyphSvg } from "@/components/icons/vehicle";
import { MapCanvas } from "@/components/map/MapCanvas";
import { useT } from "@/lib/i18n/client";
import type { CachedRoute, DriverAlertView, DriverVehicle } from "@/lib/driver/protocol";
import { ALERT_CATEGORY_META, ROLE_META, signalHealth, SIGNAL_META } from "@/lib/types";

/**
 * Mapa do motorista.
 *
 * Diferente do mapa da direção em três pontos, e todos vêm de quem está
 * olhando: alguém dirigindo, de relance, com o celular no suporte.
 *
 *  - O PRÓPRIO VEÍCULO É O CENTRO. A câmera segue o motorista até ele arrastar
 *    o mapa; a partir daí ela para de brigar com ele, e um botão devolve o
 *    seguimento. Câmera que "puxa" a cada atualização torna impossível olhar
 *    para frente no percurso.
 *
 *  - MARCADORES EM DOM, NÃO EM CAMADA DE SÍMBOLO. O estilo base é raster e não
 *    tem `glyphs`, então camadas com texto não renderizam. Com uma dúzia de
 *    veículos, marcadores HTML são mais simples e ainda permitem emoji e
 *    contorno por saúde de sinal.
 *
 *  - O TRAÇADO VEM DO CACHE LOCAL. Ele foi gravado no vínculo. Sem rede os
 *    tiles do fundo não carregam, mas a linha do percurso e os veículos
 *    continuam desenhados — que é a informação que importa.
 */

export interface DriverMapProps {
  route: CachedRoute | null;
  vehicles: DriverVehicle[];
  /** Alertas ativos da prova — o mapa é coletivo, não só da direção. */
  alerts: DriverAlertView[];
  /** Hora do servidor na última leitura, para calcular idade dos pings. */
  serverTimeMs: number | null;
  className?: string;
}

export function DriverMap({
  route,
  vehicles,
  alerts,
  serverTimeMs,
  className,
}: DriverMapProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const markersRef = useRef(new Map<string, maplibregl.Marker>());
  const alertMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  const followRef = useRef(true);
  const fittedRef = useRef(false);
  const [following, setFollowing] = useState(true);
  const t = useT();

  const applyRoute = useCallback((map: MapLibreMap, cached: CachedRoute | null) => {
    if (!cached || cached.renderPoints.length < 2) return;

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: cached.renderPoints },
    };

    const existing = map.getSource("race-route");
    if (existing) {
      (existing as maplibregl.GeoJSONSource).setData(geojson);
      return;
    }

    map.addSource("race-route", { type: "geojson", data: geojson });

    // Duas linhas sobrepostas: um halo escuro embaixo dá contraste sobre
    // qualquer tile, inclusive sobre neve, areia ou mancha urbana clara.
    map.addLayer({
      id: "race-route-halo",
      type: "line",
      source: "race-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0a0c10", "line-width": 9, "line-opacity": 0.85 },
    });

    map.addLayer({
      id: "race-route-line",
      type: "line",
      source: "race-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#38bdf8", "line-width": 4 },
    });

    if (!fittedRef.current) {
      fittedRef.current = true;
      const bounds = new maplibregl.LngLatBounds(
        cached.renderPoints[0] as [number, number],
        cached.renderPoints[0] as [number, number],
      );
      for (const p of cached.renderPoints) bounds.extend(p as [number, number]);
      map.fitBounds(bounds, { padding: 48, animate: false });
    }
  }, []);

  const syncMarkers = useCallback(
    (map: MapLibreMap, list: DriverVehicle[], nowMs: number | null, tr: Translate) => {
      const seen = new Set<string>();

      for (const vehicle of list) {
        if (vehicle.lat == null || vehicle.lng == null) continue;
        seen.add(vehicle.positionId);

        const ageSeconds =
          vehicle.recordedAt && nowMs
            ? Math.max(0, (nowMs - Date.parse(vehicle.recordedAt)) / 1000)
            : null;

        let marker = markersRef.current.get(vehicle.positionId);

        if (!marker) {
          marker = new maplibregl.Marker({ element: createMarkerElement(), anchor: "center" });
          marker.setLngLat([vehicle.lng, vehicle.lat]).addTo(map);
          markersRef.current.set(vehicle.positionId, marker);
        } else {
          marker.setLngLat([vehicle.lng, vehicle.lat]);
        }

        paintMarker(marker.getElement(), vehicle, ageSeconds, tr);
      }

      for (const [id, marker] of markersRef.current) {
        if (!seen.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }

      const self = list.find((v) => v.isSelf);
      if (followRef.current && self?.lat != null && self.lng != null) {
        map.easeTo({ center: [self.lng, self.lat], duration: 600 });
      }
    },
    [],
  );

  /**
   * Alertas no mapa de todo mundo.
   *
   * É o que transforma o app de "eu reporto para a direção" em consciência
   * coletiva: quem vem atrás vê o acidente antes de chegar nele. O marcador é
   * maior que o de veículo de propósito — um ponto do mapa que exige mudança de
   * comportamento não pode ter o mesmo peso visual de um carro que está apenas
   * andando.
   */
  const syncAlerts = useCallback((map: MapLibreMap, list: DriverAlertView[]) => {
    const seen = new Set<string>();

    for (const alert of list) {
      if (alert.lat == null || alert.lng == null) continue;
      if (alert.status === "resolved" || alert.status === "cancelled") continue;
      seen.add(alert.alertId);

      let marker = alertMarkersRef.current.get(alert.alertId);
      if (!marker) {
        const el = document.createElement("div");
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.width = "38px";
        el.style.height = "38px";
        el.style.borderRadius = "8px";
        el.style.fontSize = "20px";
        marker = new maplibregl.Marker({ element: el, anchor: "bottom" });
        marker.setLngLat([alert.lng, alert.lat]).addTo(map);
        alertMarkersRef.current.set(alert.alertId, marker);
      } else {
        marker.setLngLat([alert.lng, alert.lat]);
      }

      const el = marker.getElement();
      el.style.background =
        alert.category === "medical" ? "var(--color-critical)" : "var(--color-warn)";
      el.style.border = "2px solid #0a0c10";
      el.textContent = ALERT_CATEGORY_META[alert.category].icon;
      el.title = alert.note ?? ALERT_CATEGORY_META[alert.category].label;
    }

    for (const [id, marker] of alertMarkersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        alertMarkersRef.current.delete(id);
      }
    }
  }, []);

  const handleReady = useCallback(
    (map: MapLibreMap) => {
      mapRef.current = map;
      readyRef.current = true;

      // Arrastar o mapa é uma declaração de intenção: o motorista quer olhar
      // outro ponto do percurso. A câmera para de segui-lo até ele pedir.
      map.on("dragstart", () => {
        followRef.current = false;
        setFollowing(false);
      });

      applyRoute(map, route);
      syncMarkers(map, vehicles, serverTimeMs, t);
      syncAlerts(map, alerts);
    },
    [applyRoute, syncMarkers, syncAlerts, route, vehicles, alerts, serverTimeMs, t],
  );

  useEffect(() => {
    if (readyRef.current && mapRef.current) applyRoute(mapRef.current, route);
  }, [route, applyRoute]);

  useEffect(() => {
    if (readyRef.current && mapRef.current) {
      syncMarkers(mapRef.current, vehicles, serverTimeMs, t);
    }
  }, [vehicles, serverTimeMs, syncMarkers, t]);

  useEffect(() => {
    if (readyRef.current && mapRef.current) syncAlerts(mapRef.current, alerts);
  }, [alerts, syncAlerts]);

  useEffect(() => {
    const markers = markersRef.current;
    const alertMarkers = alertMarkersRef.current;
    return () => {
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      for (const marker of alertMarkers.values()) marker.remove();
      alertMarkers.clear();
    };
  }, []);

  function recenter() {
    followRef.current = true;
    setFollowing(true);
    const self = vehicles.find((v) => v.isSelf);
    if (self?.lat != null && self.lng != null && mapRef.current) {
      mapRef.current.easeTo({ center: [self.lng, self.lat], zoom: 14, duration: 500 });
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <MapCanvas onReady={handleReady} className="h-full w-full" initialZoom={13} />

      {!following ? (
        <button
          type="button"
          onClick={recenter}
          className="touch-target absolute bottom-4 left-4 rounded-full border border-border-strong bg-surface-2/95 px-5 text-sm font-medium text-ink shadow-lg"
        >
          {t("map.followMe")}
        </button>
      ) : null}
    </div>
  );
}

function createMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.borderRadius = "9999px";
  el.style.fontSize = "15px";
  el.style.lineHeight = "1";
  el.style.transition = "width .2s, height .2s";
  return el;
}

type Translate = ReturnType<typeof useT>;

function paintMarker(
  el: HTMLElement,
  vehicle: DriverVehicle,
  ageSeconds: number | null,
  t: Translate,
): void {
  const meta = ROLE_META[vehicle.role];
  const signal = signalHealth(ageSeconds);
  const size = vehicle.isSelf ? 44 : 32;

  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.background = meta.color;
  el.style.border = `${vehicle.isSelf ? 4 : 2}px solid ${SIGNAL_META[signal].color}`;
  // Sinal perdido não some do mapa: o veículo continua onde foi visto pela
  // última vez, apagado, porque "não sei onde está" e "não existe" são coisas
  // diferentes e a segunda leva a decisões piores.
  el.style.opacity = signal === "lost" || signal === "never" ? "0.4" : "1";
  el.style.boxShadow = vehicle.isSelf ? "0 0 0 3px rgba(56,189,248,.45)" : "none";

  // Pictograma, não emoji: o desenho tem que ser o mesmo do painel da direção,
  // e emoji muda de forma (e de legibilidade) em cada aparelho. `innerHTML`
  // aqui recebe SVG gerado por nós — nada que venha do banco entra por aqui.
  if (el.dataset.papel !== vehicle.role) {
    el.innerHTML = vehicleGlyphSvg(vehicle.role, "#0a0c10", vehicle.isSelf ? 24 : 18);
    el.dataset.papel = vehicle.role;
  }

  const signalLabel = t(`signal.${signal}`);
  el.title = `${vehicle.label} · ${signalLabel}`;
  el.setAttribute("aria-label", `${vehicle.label}, ${signalLabel}`);
}
