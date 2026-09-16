"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ServiceCenter } from "../model/types";
import styles from "./service-center-map.module.css";

type ServiceCenterMapProps = {
  centers: ServiceCenter[];
  selectedId?: string;
  onSelect: (id: string) => void;
  language: "en" | "id";
  onLocationPick?: (latitude: number, longitude: number) => void;
};

const indonesiaBounds: L.LatLngBoundsExpression = [[-11.2, 94.5], [6.2, 141.1]];

const translations = {
  en: {
    label: "Map of Gascomp service centers in Indonesia",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    loading: "Loading map…",
    unavailable: "Some map tiles could not load. You can still use the location list and Google Maps links.",
    pick: "Click the map to set the location, or enter coordinates in the fields below.",
  },
  id: {
    label: "Peta service center Gascomp di Indonesia",
    zoomIn: "Perbesar peta",
    zoomOut: "Perkecil peta",
    loading: "Memuat peta…",
    unavailable: "Sebagian peta tidak dapat dimuat. Daftar lokasi dan tautan Google Maps tetap dapat digunakan.",
    pick: "Klik peta untuk menentukan lokasi, atau masukkan koordinat pada kolom di bawah.",
  },
};

function markerIcon(selected: boolean) {
  return L.divIcon({
    className: `${styles.marker} ${selected ? styles.selected : ""}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

export default function ServiceCenterMap({ centers, selectedId, onSelect, language, onLocationPick }: ServiceCenterMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const editorMode = useRef(Boolean(onLocationPick));
  const viewport = useRef<{ initialized: boolean; targetId?: string; points?: string }>({ initialized: false });
  const previousSelection = useRef<string | undefined>(undefined);
  const [tileStatus, setTileStatus] = useState<"loading" | "ready" | "error">("loading");
  const copy = translations[language];
  const selectCenter = useEffectEvent((id: string) => onSelect(id));
  const pickLocation = useEffectEvent((event: L.LeafletMouseEvent) => {
    onLocationPick?.(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
  });

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      minZoom: 3,
      maxZoom: 19,
    });
    map.current = instance;
    let failed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });
    tiles.on("loading", () => {
      failed = false;
      setTileStatus("loading");
      clearTimeout(timeout);
      timeout = setTimeout(() => setTileStatus("error"), 15000);
    });
    tiles.on("tileerror", () => {
      failed = true;
      setTileStatus("error");
    });
    tiles.on("load", () => {
      clearTimeout(timeout);
      setTileStatus(failed ? "error" : "ready");
    });
    tiles.addTo(instance);
    instance.fitBounds(indonesiaBounds, { padding: [16, 16], animate: false });
    instance.on("click", pickLocation);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      tiles.off();
      instance.remove();
      map.current = null;
      viewport.current = { initialized: false };
      previousSelection.current = undefined;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const control = L.control.zoom({ zoomInTitle: copy.zoomIn, zoomOutTitle: copy.zoomOut }).addTo(instance);
    return () => { control.remove(); };
  }, [copy.zoomIn, copy.zoomOut]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const group = L.featureGroup().addTo(instance);
    const nextMarkers = new Map<string, L.Marker>();
    for (const center of centers) {
      if (!Number.isFinite(center.latitude) || !Number.isFinite(center.longitude)) continue;
      const content = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = center.name;
      const address = document.createElement("p");
      address.textContent = `${center.address}, ${center.city}`;
      content.append(name, address);
      const marker = L.marker([center.latitude, center.longitude], {
        icon: markerIcon(false),
        title: center.name,
        alt: center.name,
        keyboard: true,
      }).bindPopup(content, { closeButton: false, autoPan: !editorMode.current }).addTo(group);
      marker.on("click", () => selectCenter(center.id));
      nextMarkers.set(center.id, marker);
    }
    markers.current = nextMarkers;
    const targetId = centers[0]?.id;
    const points = JSON.stringify(centers.map(({ id, latitude, longitude }) => [id, latitude, longitude]).sort());
    const previous = viewport.current;
    const changedEditorTarget = Boolean(targetId && previous.targetId && targetId !== previous.targetId);
    const shouldFit = editorMode.current
      ? !previous.initialized || changedEditorTarget
      : previous.points !== points;
    if (shouldFit) {
      instance.fitBounds(group.getLayers().length ? group.getBounds() : indonesiaBounds, {
        padding: [36, 36],
        maxZoom: 13,
        animate: false,
      });
    }
    // Keep the editor identity through temporarily incomplete coordinate fields.
    viewport.current = { initialized: true, targetId: targetId ?? previous.targetId, points };
    return () => { group.remove(); };
  }, [centers]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const selectionChanged = previousSelection.current !== selectedId;
    for (const [id, marker] of markers.current) {
      const selected = id === selectedId;
      marker.setIcon(markerIcon(selected));
      marker.setZIndexOffset(selected ? 1000 : 0);
      marker.getElement()?.setAttribute("aria-pressed", String(selected));
      if (selected && !editorMode.current) {
        if (selectionChanged) {
          instance.setView(marker.getLatLng(), Math.max(instance.getZoom(), 12), { animate: false });
        }
        const popup = marker.getPopup();
        if (popup) popup.options.autoPan = selectionChanged;
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    }
    previousSelection.current = selectedId;
  }, [selectedId, centers]);

  return (
    <div className={styles.wrapper}>
      <div ref={container} className={styles.map} role="region" aria-label={copy.label} />
      {tileStatus !== "ready" && (
        <p className={styles.status} role="status">{tileStatus === "loading" ? copy.loading : copy.unavailable}</p>
      )}
      {onLocationPick && <p className={styles.hint}>{copy.pick}</p>}
    </div>
  );
}
