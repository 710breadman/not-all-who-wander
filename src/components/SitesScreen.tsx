import { FormEvent, useState } from "react";
import { archiveSite, saveSite } from "../application/siteService";
import type { Site, SiteAmenities, SiteVisitState } from "../domain/models";

export function SitesScreen({ sites, onBack, onChanged }: { sites: Site[]; onBack: () => void; onChanged: () => Promise<void> }) {
  const [editor, setEditor] = useState<Site>();
  const [showArchived, setShowArchived] = useState(false);
  const visible = sites.filter((site) => showArchived || !site.archived);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "").trim();
    if (!name) return;
    const number = (key: string) => {
      const value = String(values.get(key) ?? "").trim();
      return value ? Number(value) : undefined;
    };
    const amenities: SiteAmenities = Object.fromEntries(
      ["potableWater", "toilets", "showers", "fireRing", "picnicTable", "bearStorage", "electricity"].map((key) => [key, values.get(key) === "on"]),
    );
    const lastVerified = String(values.get("lastVerified") ?? "");
    const latitude = number("latitude");
    const longitude = number("longitude");
    const rating = number("rating");
    await saveSite({
      ...(editor?.id ? { id: editor.id, createdAt: editor.createdAt, archived: editor.archived } : {}),
      name,
      ...(latitude === undefined ? {} : { latitude }),
      ...(longitude === undefined ? {} : { longitude }),
      notes: String(values.get("notes") ?? ""),
      sourceUrl: String(values.get("sourceUrl") ?? ""),
      tags: String(values.get("tags") ?? "").split(","),
      ...(rating === undefined ? {} : { rating }),
      visitState: String(values.get("visitState")) as SiteVisitState,
      ...(lastVerified ? { lastVerified } : {}),
      amenities: {
        ...amenities,
        ...(String(values.get("cellServiceNotes") ?? "").trim()
          ? { cellServiceNotes: String(values.get("cellServiceNotes")).trim() }
          : {}),
      },
      accessNotes: String(values.get("accessNotes") ?? ""),
      vehicleSuitability: String(values.get("vehicleSuitability") ?? ""),
      trailerRvNotes: String(values.get("trailerRvNotes") ?? ""),
      parkingNotes: String(values.get("parkingNotes") ?? ""),
      costReservationPermitNotes: String(values.get("costReservationPermitNotes") ?? ""),
    });
    await onChanged();
    setEditor(undefined);
  }
  return <main className="app-shell"><header className="trip-header"><button className="text-button" type="button" onClick={onBack}>← All trips</button><p className="eyebrow">LOCAL SITE IDEAS</p><h1>Remember the good spots.</h1><p className="trip-destination">Private, offline campsite notes you can link to any trip.</p></header><section className="inventory-card"><div className="section-heading"><div><h2>Saved sites</h2><p className="empty-state">Keep places worth visiting, plus the details you will want at the trailhead.</p></div><button className="primary-action" type="button" onClick={() => setEditor(emptySite())}>+ Add site</button></div><label className="sort-control"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label>{visible.length ? <ul className="item-list">{visible.map((site) => <li className="inventory-item" key={site.id}><div><strong>{site.name}</strong><small>{site.visitState.replaceAll("-", " ")}{site.rating ? ` · ${site.rating}/5` : ""}{site.tags.length ? ` · ${site.tags.join(", ")}` : ""}{site.archived ? " · archived" : ""}</small></div><button className="promote" type="button" onClick={() => setEditor(site)}>Edit</button>{!site.archived && <button className="promote danger" type="button" onClick={() => void archiveSite(site.id).then(onChanged)}>Archive</button>}</li>)}</ul> : <p className="empty-state">No site ideas yet. Add one here, or save a trip destination in one tap.</p>}</section>{editor && <SiteDialog site={editor} onClose={() => setEditor(undefined)} onSubmit={submit} />}</main>;
}

function emptySite(): Site {
  return { id: "", name: "", tags: [], visitState: "want-to-visit", amenities: {}, createdAt: "", updatedAt: "", archived: false };
}

function SiteDialog({ site, onClose, onSubmit }: { site: Site; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const amenity = (key: keyof SiteAmenities) => site.amenities[key] === true;
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label={site.id ? "Edit site" : "Add site"}><div className="dialog-heading"><h2>{site.id ? "Edit site" : "Add site"}</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><form onSubmit={(event) => void onSubmit(event)}><label>Name<input name="name" autoFocus required defaultValue={site.name} placeholder="Big Sur campground" /></label><div className="field-row"><label>Latitude<input name="latitude" type="number" step="any" defaultValue={site.latitude} /></label><label>Longitude<input name="longitude" type="number" step="any" defaultValue={site.longitude} /></label></div><div className="field-row"><label>Visit state<select name="visitState" defaultValue={site.visitState}><option value="want-to-visit">Want to visit</option><option value="visited">Visited</option><option value="revisit">Revisit</option></select></label><label>Rating <small>(optional)</small><input name="rating" type="number" min="1" max="5" defaultValue={site.rating} /></label></div><label>Tags <small>(comma separated)</small><input name="tags" defaultValue={site.tags.join(", ")} placeholder="coast, family friendly" /></label><label>Source URL <small>(optional)</small><input name="sourceUrl" type="url" defaultValue={site.sourceUrl} placeholder="https://" /></label><label>Last verified<input name="lastVerified" type="date" defaultValue={site.lastVerified} /></label><fieldset className="choice-set"><legend>Amenities</legend>{[["potableWater", "Potable water"], ["toilets", "Toilets"], ["showers", "Showers"], ["fireRing", "Fire ring"], ["picnicTable", "Picnic table"], ["bearStorage", "Bear storage"], ["electricity", "Electricity"]].map(([key, label]) => <label key={key}><input name={key} type="checkbox" defaultChecked={amenity(key as keyof SiteAmenities)} />{label}</label>)}</fieldset><label>Cell service notes<textarea name="cellServiceNotes" rows={2} defaultValue={site.amenities.cellServiceNotes} /></label><label>Road / access notes<textarea name="accessNotes" rows={2} defaultValue={site.accessNotes} /></label><label>Vehicle suitability<input name="vehicleSuitability" defaultValue={site.vehicleSuitability} placeholder="High clearance recommended" /></label><label>Trailer / RV notes<textarea name="trailerRvNotes" rows={2} defaultValue={site.trailerRvNotes} /></label><label>Parking notes<textarea name="parkingNotes" rows={2} defaultValue={site.parkingNotes} /></label><label>Cost, reservation, or permit notes<textarea name="costReservationPermitNotes" rows={2} defaultValue={site.costReservationPermitNotes} /></label><label>Personal notes<textarea name="notes" rows={3} defaultValue={site.notes} /></label><button className="primary-action" type="submit">Save site</button></form></section></div>;
}
