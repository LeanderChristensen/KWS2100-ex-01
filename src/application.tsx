import React, { useEffect, useRef, useState } from "react";
import { Feature, Map, MapBrowserEvent, View } from "ol";
import TileLayer from "ol/layer/Tile.js";
import { OSM } from "ol/source.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import { GeoJSON } from "ol/format.js";
import { useGeographic } from "ol/proj.js";
import "ol/ol.css";
import { Circle, Fill, Stroke, Style, Text } from "ol/style.js";
import CircleGeom from "ol/geom/Circle.js";
import "./application.css";
import Geolocation from "ol/Geolocation.js";
import { getCenter } from "ol/extent.js";

useGeographic();

const fylkeSource = new VectorSource({
  url: "/KWS2100-ex/geojson/fylker.geojson",
  format: new GeoJSON(),
});

const kommuneSource = new VectorSource({
  url: "/KWS2100-ex/geojson/kommuner.geojson",
  format: new GeoJSON(),
});

const vgsSource = new VectorSource({
  url: "/KWS2100-ex/geojson/vgs.geojson",
  format: new GeoJSON(),
});

const view = new View({
  center: [11, 60],
  zoom: 8,
});

const userCenter = [12.4924, 41.8902];
const userCircle = new Feature({
  geometry: new CircleGeom(userCenter, 0.01),
  style: new Style({
    stroke: new Stroke({ width: 2 }),
    fill: new Fill({ color: "red" }),
  }),
});

const map = new Map({
  layers: [
    new TileLayer({ source: new OSM() }),
    new VectorLayer({
      source: fylkeSource,
      style: new Style({
        stroke: new Stroke({ color: "blue", width: 2 }),
        fill: new Fill({
          color: "#ff000020",
        }),
      }),
    }),
    new VectorLayer({
      source: kommuneSource,
    }),
    // new VectorLayer({
    //   source: vgsSource,
    //   style: new Style({
    //     image: new Circle({
    //       radius: 5,
    //       fill: new Fill({ color: "red" }),
    //       stroke: new Stroke({ color: "black", width: 2 }),
    //     }),
    //   }),
    // }),
    new VectorLayer({
      source: new VectorSource({ features: [userCircle] }),
    }),
  ],
  view: view,
});

export function Application() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const geolocation = new Geolocation({
    projection: view.getProjection(),
  });

  const [activeFylke, setActiveFylke] = useState<Feature>();
  const [alleKommuner, setAlleKommuner] = useState<Feature[]>([]);
  const [selectedKommune, setSelectedKommune] = useState<Feature>();
  const [userLocation, setUserLocation] = useState<any>(
    geolocation.getPosition(),
  );

  function handlePointerMove(e: MapBrowserEvent) {
    const fylke = fylkeSource.getFeaturesAtCoordinate(e.coordinate);
    setActiveFylke(fylke.length > 0 ? fylke[0] : undefined);
  }

  function handleMapClick(e: MapBrowserEvent) {
    const clickedKommune = kommuneSource.getFeaturesAtCoordinate(e.coordinate);
    setSelectedKommune(
      clickedKommune.length > 0 ? clickedKommune[0] : undefined,
    );
  }

  useEffect(() => {
    activeFylke?.setStyle(
      (fylke) =>
        new Style({
          stroke: new Stroke({ color: "blue", width: 4 }),
          text: new Text({
            text: fylke.getProperties()["fylkesnavn"],
          }),
        }),
    );
    return () => activeFylke?.setStyle(undefined);
  }, [activeFylke]);

  useEffect(() => {
    map.setTarget(mapRef.current!);
    map.on("pointermove", handlePointerMove);
    map.on("click", handleMapClick);
    kommuneSource.on("change", () =>
      setAlleKommuner(kommuneSource.getFeatures()),
    );
    geolocation.setTracking(true);
    geolocation.on("change", function (evt: any) {
      setUserLocation(geolocation.getPosition());
      (userCircle.getGeometry() as CircleGeom).setCenter(
        geolocation.getPosition()!,
      );
      view.animate({ center: geolocation.getPosition() });
    });
  }, []);

  function handleClick(kommuneProperties: Record<string, any>) {
    view.animate({ center: getCenter(kommuneProperties.geometry.getExtent()) });
  }

  return (
    <>
      <h1>
        {selectedKommune
          ? selectedKommune.getProperties()["kommunenavn"] + " "
          : "Kart over administrative områder i Norge "}
      </h1>
      <main>
        <div ref={mapRef}></div>
        <aside>
          <h2>Alle kommuner</h2>
          <ul>
            {alleKommuner
              .map((f) => f.getProperties())
              .sort((a, b) => a["kommunenavn"].localeCompare(b["kommunenavn"]))
              .map((k) => (
                <li>
                  <a href={"#"} onClick={(e) => handleClick(k)}>
                    {k["kommunenavn"]}
                  </a>
                </li>
              ))}
          </ul>
        </aside>
      </main>
    </>
  );
}
