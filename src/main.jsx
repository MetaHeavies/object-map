import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Plus,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Minus,
  X,
  Search,
  Undo2,
  Redo2,
  Copy,
  Check,
  Maximize,
  Layers,
  Link2,
  MoreHorizontal,
  Trash2,
  GitBranch,
  Settings,
  ExternalLink,
  MoveUpRight,
  Download,
  RotateCcw,
  Info,
  Square,
  Command,
  Pencil,
} from "lucide-react";
import {
  sections,
  clone,
  makeObject,
  addItem,
  promote,
  demote,
  removeObject,
  changesBetween,
  validateMap,
  focusContext,
} from "./model.mjs";
import { motion, treatments } from "./motion";
import { arrange, columnOrder, reorderColumns, positionsForOrder, COLUMN_STEP } from "./layout.mjs";
import { Reveal } from "./Reveal";
import { ColumnAdd } from "./ColumnAdd";
import { Guide } from "./Guide.jsx";
import "./styles.css";
import "./focus.css";
const initialLayout = {
  version: 1,
  positions: {},
  viewport: { x: 70, y: 100, zoom: 1 },
};
const RUN_PROMPT =
  "Run Object Map on this repository. Inspect the implementation, populate the map, and tell me what you were unsure about.";
const sectionLabels = {
  attributes: "Attributes",
  relationships: "Relationships",
  actions: "Actions",
  states: "States",
};
const sectionColors = {
  attributes: "amber",
  relationships: "blue",
  actions: "green",
  states: "purple",
};
const icons = {
  attributes: Square,
  relationships: Link2,
  actions: ArrowUpRight,
  states: RotateCcw,
};
const summaryNouns = {
  attributes: ["attribute", "attributes"],
  relationships: ["relationship", "relationships"],
  actions: ["action", "actions"],
  states: ["state", "states"],
};
function objectSummary(object) {
  const parts = Object.keys(summaryNouns)
    .filter((section) => object[section].length)
    .map((section) => {
      const count = object[section].length;
      const [one, many] = summaryNouns[section];
      return `${count} ${count === 1 ? one : many}`;
    });
  return parts.length ? parts.join(" \u00b7 ") : "Empty";
}
async function api(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to connect to the repository.");
  return result;
}
function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={16} />
    </button>
  );
}
function Editable({
  value,
  onSave,
  onSelect,
  selected,
  suffix,
  label,
  className = "",
  placeholder = "Untitled",
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value);
  const input = useRef();
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  const save = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    else setDraft(value);
  };
  return editing ? (
    <input
      ref={input}
      className={`inline-input ${className}`}
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") save();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  ) : (
    <button
      className={`editable ${className}`}
      onClick={(event) => onSelect?.(event)}
      onDoubleClick={() => {
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          setEditing(true);
        }
      }}
      title={`Select ${value || label}. Double-click or press F2 to edit.`}
      aria-label={onSelect ? `Select ${value}` : `Select ${label}`}
      aria-pressed={selected}
    >
      {value || <span className="placeholder">{placeholder}</span>}
      {suffix}
    </button>
  );
}
function ItemComposer({ section, object, map, onAdd, onCancel, onReveal }) {
  const [name, setName] = useState(""),
    [target, setTarget] = useState("");
  const input = useRef();
  useLayoutEffect(() => {
    input.current?.focus({preventScroll:true});
    const frame = requestAnimationFrame(() => onReveal?.(input.current));
    return () => cancelAnimationFrame(frame);
  }, []);
  const matches = map.objects.filter((o) =>
    o.name.toLowerCase().includes(name.toLowerCase()),
  );
  return (
    <form
      className="item-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && (section !== "relationships" || target)) {
          onAdd(name, target);
        }
      }}
    >
      <input
        ref={input}
        aria-label={section === "actions" ? "New CTA" : `New ${sectionLabels[section].toLowerCase().slice(0, -1)}`}
        placeholder={
          section === "relationships" ? "Find an object…" : "Give it a name…"
        }
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setTarget("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      {section === "relationships" && !target && (
        <div className="suggestions">
          {matches.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => {
                setTarget(o.id);
                setName(o.name);
              }}
            >
              <span>{o.name}</span>
              <ArrowUpRight size={13} />
            </button>
          ))}
          {!matches.length && (
            <small>No matching object. Create one on the canvas first.</small>
          )}
        </div>
      )}
      <div className="composer-actions">
        <button
          type="submit"
          disabled={!name.trim() || (section === "relationships" && !target)}
        >
          {section === "relationships" ? "Connect" : "Add"}{" "}
          <ArrowRight size={12} />
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
function ObjectCard({
  object,
  index,
  expanded,
  focused,
  dimmed,
  related,
  relevantRelationships,
  onSelect,
  position,
  dragging,
  map,
  onToggle,
  onChange,
  onPromote,
  nameRelationship,
  onNamedRelationship,
  onDelete,
  onDemote,
  onCopy,
  onTraverse,
  onDrag,
  onSize,
  onRevealComposer,
  selectedItem,
  onSelectItem,
  showStates,
  showEvidence,
  notify,
}) {
  const cardRef = useRef();
  useLayoutEffect(() => {
    const card = cardRef.current;
    const report = () => onSize(`${object.id}:${expanded}`, card.offsetHeight);
    const observer = new ResizeObserver(report);
    observer.observe(card);
    report();
    return () => observer.disconnect();
  }, [object.id, expanded, onSize]);
  const [composer, setComposer] = useState(null),
    [menu, setMenu] = useState(false),
    [evidence, setEvidence] = useState(false),
    [editingRelationship, setEditingRelationship] = useState(null);
  // A freshly promoted relationship carries the attribute's name as a placeholder
  // role. Open its editor so naming it is part of the promotion, not a later chore.
  useEffect(() => {
    if (!nameRelationship) return;
    if (!object.relationships.some((r) => r.id === nameRelationship)) return;
    setEditingRelationship(nameRelationship);
    onNamedRelationship?.();
    // Depending on object.relationships would rerun on every render, since it is a
    // fresh array each time, and hold the editor open against the builder closing it.
  }, [nameRelationship]);
  const hasFocus = focused || related || dimmed;
  const showDetails = expanded && (!hasFocus || focused);
  useEffect(() => {
    if (!showDetails) {
      setComposer(null);
      setEditingRelationship(null);
    }
  }, [showDetails]);
  const visible = sections.filter(
    (s) => s !== "states" || showStates || object.states.length > 0 || composer === "states",
  );
  const update = (fn) => {
    const next = clone(map);
    fn(next.objects.find((o) => o.id === object.id));
    onChange(next);
  };
  return (
    <article
      ref={cardRef}
      className={`object-card ${expanded ? "expanded" : ""} ${focused ? "focused" : ""} ${dimmed ? "dimmed" : ""} ${related ? "related" : ""}`}
      style={{ left: 0, top: 0, translate: `${position.x}px ${position.y}px`, width: 250 }}
      data-dragging={dragging || undefined}
      data-object-id={object.id}
      data-motion-id={object.promotedFrom?.attribute.id || object.id}
    >
      <div className="object-heading" onClick={e => {
        if (!e.target.closest('button,input,.card-tools')) onSelect(object.id);
      }} onPointerDown={e => {
        if (!e.target.closest('input,.card-tools')) onDrag(e, object.id);
      }}>
        <div
          className="card-head"
        >
          <span className="object-mark">
            <Layers size={15} />
          </span>
          <span className="object-index">
            OBJECT {String(index + 1).padStart(2, "0")}
          </span>
          <div className="card-tools">
            <div className="menu-anchor">
              <IconButton
                icon={MoreHorizontal}
                label={`Options for ${object.name}`}
                onClick={() => setMenu(!menu)}
              />
              {menu && (
                <>
                  <button
                    className="menu-dismiss"
                    aria-label="Close object options"
                    onClick={() => setMenu(false)}
                  />
                  <div className="context-menu">
                    <button
                      onClick={() => {
                        onToggle(object.id);
                        setMenu(false);
                      }}
                    >
                      {expanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      {expanded ? "Collapse" : "Expand"} {object.name}
                    </button>
                    <button
                      onClick={() => {
                        onCopy(object.id);
                        setMenu(false);
                      }}
                    >
                      <Copy size={14} />
                      Copy reference
                    </button>
                    <button
                      onClick={() => {
                        setEvidence(!evidence);
                        setMenu(false);
                      }}
                    >
                      <GitBranch size={14} />
                      Implementation evidence
                    </button>
                    {object.promotedFrom && (
                      <button
                        onClick={() => {
                          onDemote(object.id);
                          setMenu(false);
                        }}
                      >
                        <ArrowLeft size={14} />
                        Demote to attribute
                      </button>
                    )}
                    <button
                      className="danger"
                      onClick={() => {
                        onDelete(object.id);
                        setMenu(false);
                      }}
                    >
                      <Trash2 size={14} />
                      Delete object
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <Editable
          className="object-title"
          label={`${object.name} name`}
          onSelect={() => onSelect(object.id)}
          selected={focused}
          value={object.name}
          onSave={(name) => update((o) => (o.name = name))}
        />
        {expanded ? (
          <Editable
            className="object-definition"
            label={`${object.name} definition`}
            value={object.description}
            placeholder="What is this object?"
            onSave={(description) => update((o) => (o.description = description))}
          />
        ) : (
          <div className="object-summary">{objectSummary(object)}</div>
        )}
      </div>
      <div className={`object-sections columns-${visible.length}`}>
        {visible.map((section) => {
          const Icon = icons[section];
          const showMatchingRelations =
            section === "relationships" &&
            related &&
            object.relationships.some((item) =>
              relevantRelationships.has(item.id),
            );
          // A reference is focus context even if its containing column was
          // manually collapsed. Preserve that collapse preference for later.
          const showSection = (showDetails && (object[section].length > 0 || composer === section)) || showMatchingRelations;
          return (
            <Reveal
              open={showSection}
              className="section-reveal"
              data-section={section}
              key={section}
            >
              <section className={`object-section ${sectionColors[section]}`}>
                <h3>
                  <Icon size={12} />
                  {sectionLabels[section]}
                  <span>{object[section].length}</span>
                </h3>
                <div className="items">
                  {object[section].map((item) => (
                    <Reveal
                      key={item.id}
                      className="row-reveal"
                      open={
                        section !== "relationships" ||
                        showDetails ||
                        (showMatchingRelations &&
                          relevantRelationships.has(item.id))
                      }
                    >
                      <div
                        className={`mini-card ${section === "relationships" ? "relationship" : ""} ${relevantRelationships.has(item.id) ? "is-relevant" : ""} ${selectedItem === item.id ? "selected-item" : ""}`}
                        data-motion-id={item.id}
                        onClick={e => {
                          if (!e.target.closest('input,select,.item-tools,.relationship-follow')) onSelectItem(item.id);
                        }}
                      >
                        <Editable
                          className={section === "relationships" ? "relationship-link" : ""}
                          label={item.name}
                          value={item.name}
                          onSelect={() => onSelectItem(item.id)}
                          selected={selectedItem === item.id}
                          suffix={
                            <>
                              {section === "relationships" && (
                                <span className="relationship-target">
                                  {map.objects.find((o) => o.id === item.target)?.name}
                                </span>
                              )}
                              {/* Marked only when it changes the interface: many needs a
                                  list, filterable needs a control on some browse screen. */}
                              {item.cardinality === "many" && (
                                <span className="row-tag">many</span>
                              )}
                              {item.filterable && <span className="row-tag">filter</span>}
                            </>
                          }
                          onSave={(name) => update(o => {
                            o[section].find(i => i.id === item.id).name = name;
                          })}
                        />
                        {section === "relationships" && (
                          <IconButton
                            className="icon-button relationship-follow"
                            icon={Link2}
                            label={`Go to ${map.objects.find(o => o.id === item.target)?.name}`}
                            onClick={() => onTraverse(item.target, object.id)}
                          />
                        )}
                        <div className="item-tools">
                          {section === "relationships" && (
                            <IconButton
                              icon={Pencil}
                              label={`Edit ${item.name} relationship`}
                              onClick={() => {
                                setEditingRelationship(
                                  editingRelationship === item.id
                                    ? null
                                    : item.id,
                                );
                              }}
                            />
                          )}
                          {section === "attributes" && (
                            <IconButton
                              icon={MoveUpRight}
                              label={`Promote ${item.name} to object`}
                              onClick={() => onPromote(object.id, item.id)}
                            />
                          )}
                          <IconButton
                            icon={Copy}
                            label={`Copy ${item.name} reference`}
                            onClick={() => onCopy(item.id)}
                          />
                          <IconButton
                            icon={X}
                            label={`Remove ${item.name}`}
                            onClick={() =>
                              update(
                                (o) =>
                                  (o[section] = o[section].filter(
                                    (i) => i.id !== item.id,
                                  )),
                              )
                            }
                          />
                        </div>
                        {section === "relationships" && (
                          <Reveal
                            open={editingRelationship === item.id}
                            className="relationship-editor-reveal"
                          >
                            <div
                              className="relationship-edit"
                              data-editing={editingRelationship === item.id}
                            >
                              <Editable
                                label={`${item.name} relationship`}
                                value={item.name}
                                onSave={(name) =>
                                  update(
                                    (o) =>
                                      (o.relationships.find(
                                        (i) => i.id === item.id,
                                      ).name = name),
                                  )
                                }
                              />
                              <select
                                aria-label={`${item.name} target`}
                                value={item.target}
                                onChange={(e) =>
                                  update(
                                    (o) =>
                                      (o.relationships.find(
                                        (i) => i.id === item.id,
                                      ).target = e.target.value),
                                  )
                                }
                              >
                                {map.objects.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </Reveal>
                        )}
                      </div>
                    </Reveal>
                  ))}
                </div>
                <Reveal open={showDetails && composer === section} className="composer-reveal">
                  {composer === section && (
                    <ItemComposer
                      section={section}
                      object={object}
                      map={map}
                      onAdd={(name, target) => {
                        try {
                          onChange(
                            addItem(map, object.id, section, name, target),
                          );
                          setComposer(null);
                        } catch (e) {
                          notify(e.message);
                        }
                      }}
                      onCancel={() => setComposer(null)}
                      onReveal={onRevealComposer}
                    />
                  )}
                </Reveal>
              </section>
            </Reveal>
          );
        })}
      </div>
      <Reveal open={showDetails && (evidence || showEvidence)}>
        <div className="evidence">
          <span>Implementation evidence</span>
          {object.evidence?.length ? (
            object.evidence.map((file) => <code key={file}>{file}</code>)
          ) : (
            <p>
              No implementation evidence yet. This may be a new product
              intention.
            </p>
          )}
        </div>
      </Reveal>
      <Reveal open={showDetails && (evidence || showEvidence)}>
        <footer className="object-footer">
          <button onClick={() => onCopy(object.id)}>
            <span>@</span> {object.id}
            <Copy size={11} />
          </button>
          <span>
            {object.promotedFrom
              ? "Promoted from an attribute"
              : "Product concept"}
          </span>
        </footer>
      </Reveal>
      <ColumnAdd name={object.name} onChoose={section=>{
        onSelect(object.id);
        setComposer(section);
      }} />
    </article>
  );
}
function Confirm({ title, body, confirmLabel, tone = "", onConfirm, onCancel }) {
  const accept = useRef();
  useEffect(() => {
    accept.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
      if (e.key === "Enter") { e.stopPropagation(); onConfirm(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onConfirm, onCancel]);
  return (
    <div className="modal" onPointerDown={onCancel}>
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button ref={accept} className={`primary ${tone}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
function App() {
  const [dimensions, setDimensions] = useState({}),
    [columnDrag, setColumnDrag] = useState(null),
    [columnSettling, setColumnSettling] = useState(false),
    [focusMotion, setFocusMotion] = useState(false),
    [focusAnchor, setFocusAnchor] = useState(null),
    [cameraMotion, setCameraMotion] = useState(false);
  const shellRef = useRef();
  useEffect(() => {
    const keyboard = () =>
      shellRef.current?.setAttribute("data-input", "keyboard");
    const pointer = () =>
      shellRef.current?.setAttribute("data-input", "pointer");
    window.addEventListener("keydown", keyboard, true);
    window.addEventListener("pointerdown", pointer, true);
    return () => {
      window.removeEventListener("keydown", keyboard, true);
      window.removeEventListener("pointerdown", pointer, true);
    };
  }, []);
  const onSize = useCallback(
    (key, height) =>
      setDimensions((previous) =>
        Math.abs((previous[key] || 0) - height) < 1
          ? previous
          : { ...previous, [key]: height },
      ),
    [],
  );
  const [map, setMap] = useState({ version: 1, objects: [] }),
    [layout, setLayout] = useState(initialLayout),
    [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(""),
    [config, setConfig] = useState({ name: "Atlas" }),
    [repository, setRepository] = useState("");
  const [expanded, setExpanded] = useState([]),
    [nameRelationship, setNameRelationship] = useState(null),
    [focused, setFocused] = useState(null),
    [selectedItem, setSelectedItem] = useState(null),
    [panel, setPanel] = useState(null),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [creating, setCreating] = useState(false),
    [newName, setNewName] = useState(""),
    [toast, setToast] = useState(""),
    [saveStatus, setSaveStatus] = useState("Saved"),
    [saveError, setSaveError] = useState(""),
    [history, setHistory] = useState({ past: [], future: [] }),
    [treatment, setTreatment] = useState("restrained"),
    [showStates, setShowStates] = useState(false),
    [showEvidence, setShowEvidence] = useState(false),
    [guide, setGuide] = useState(false),
    [confirm, setConfirm] = useState(null),
    [theme, setTheme] = useState(() => {
      try { return localStorage.getItem("object-map-theme") || "system"; } catch { return "system"; }
    });
  useEffect(() => {
    // "system" leaves the attribute off so the prefers-color-scheme block wins.
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.dataset.theme = theme;
    try { localStorage.setItem("object-map-theme", theme); } catch {}
  }, [theme]);
  // Columns travel when focus changes, so translate transitions stay on across
  // the move and switch off again once everything has landed.
  useEffect(() => {
    setFocusMotion(true);
    const timer = setTimeout(() => setFocusMotion(false), 260);
    return () => clearTimeout(timer);
  }, [focused]);
  const revisions = useRef({}),
    pending = useRef({}),
    saving = useRef(false),
    base = useRef(null),
    before = useRef(null),
    canvasRef = useRef(),
    layoutRef = useRef(layout),
    mapRef = useRef(map),
    toastTimer = useRef(),
    dragged = useRef(false),
    activeDrag = useRef(null),
    settleTimer = useRef(),
    persistTimer = useRef();
  const interactionRef = useRef({});
  interactionRef.current = {creating, panel};
  layoutRef.current = layout;
  mapRef.current = map;
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }, []);
  useEffect(() => {
    api("/api/workspace")
      .then((w) => {
        setMap(w.map);
        setExpanded(w.map.objects.map((o) => o.id));
        const initial =
          w.layout.mode === "ooux-columns"
            ? w.layout
            : {
                ...w.layout,
                mode: "ooux-columns",
                positions: {},
                viewport: { x: 55, y: 96, zoom: 0.9 },
              };
        setLayout(initial);
        setConfig(w.config);
        setRepository(w.repository);
        revisions.current = w.revisions;
        if (w.layout.mode !== "ooux-columns") persist("layout", initial);
        base.current = clone(w.map);
        setLoaded(true);
        // The demo repository asks for the walkthrough; a real one never does.
        if (w.config?.guide) {
          try {
            if (localStorage.getItem("object-map-guide") !== "seen") setGuide(true);
          } catch { setGuide(true); }
        }
      })
      .catch((e) => setLoadError(e.message));
    return () => clearTimeout(toastTimer.current);
  }, []);
  const flush = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    setSaveStatus("Saving…");
    try {
      while (Object.keys(pending.current).length) {
        const kind = Object.keys(pending.current)[0],
          data = pending.current[kind];
        delete pending.current[kind];
        try {
          const result = await api(`/api/${kind}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, revision: revisions.current[kind] }),
          });
          revisions.current[kind] = result.revision;
        } catch (e) {
          if (!pending.current[kind]) pending.current[kind] = data;
          throw e;
        }
      }
      setSaveStatus("Saved");
      setSaveError("");
    } catch (e) {
      setSaveStatus("Not saved");
      setSaveError(e.message);
    } finally {
      saving.current = false;
    }
  }, []);
  function persist(kind, data) {
    pending.current[kind] = clone(data);
    setSaveStatus("Saving…");
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(flush, 220);
  }
  useEffect(() => {
    const warn = (e) => {
      if (Object.keys(pending.current).length || saving.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    let stopped = false, checking = false;
    const busy = () => saving.current || Object.keys(pending.current).length || activeDrag.current ||
      interactionRef.current.creating || document.querySelector('.inline-input,.item-composer,.relationship-edit[data-editing="true"]');
    const refresh = async () => {
      if (checking || busy() || document.hidden) return;
      checking = true;
      const expected = {...revisions.current};
      try {
        const latest = await api('/api/workspace');
        if (stopped || busy() || revisions.current.map !== expected.map || revisions.current.layout !== expected.layout) return;
        if (latest.revisions.map !== expected.map) {
          validateMap(latest.map);
          const oldIds = new Set(mapRef.current.objects.map(object => object.id));
          const newIds = new Set(latest.map.objects.map(object => object.id));
          mapRef.current = latest.map;
          setMap(latest.map);
          setExpanded(previous => [...previous.filter(id => newIds.has(id)), ...latest.map.objects.filter(object => !oldIds.has(object.id)).map(object => object.id)]);
          setFocused(previous => newIds.has(previous) ? previous : null);
          setSelectedItem(null);
          setHistory({past: [], future: []});
          base.current = clone(latest.map);
          revisions.current.map = latest.revisions.map;
          if (!oldIds.size) setPanel(null);
          notify('Map updated from repository');
        }
        if (latest.revisions.layout !== expected.layout) {
          layoutRef.current = latest.layout;
          setLayout(latest.layout);
          revisions.current.layout = latest.revisions.layout;
        }
      } catch (error) {
        // Retry transient read failures; writes retain their explicit failure UI.
      } finally {checking = false;}
    };
    const timer = setInterval(refresh, 2000);
    window.addEventListener('focus', refresh);
    return () => {stopped = true; clearInterval(timer); window.removeEventListener('focus', refresh);};
  }, [loaded, notify]);
  function change(next, options = {}) {
    validateMap(next);
    before.current = motion.capture();
    setHistory((h) => ({
      past: [
        ...h.past,
        {
          map: clone(mapRef.current),
          layout: clone(layoutRef.current),
          expanded,
          focused,
        },
      ].slice(-80),
      future: [],
    }));
    setMap(next);
    persist("map", next);
    if (options.layout) {
      setLayout(options.layout);
      persist("layout", options.layout);
    }
    if (options.expanded) setExpanded(options.expanded);
    if (options.focused !== undefined) setFocused(options.focused);
  }
  const setView = (next) => {
    layoutRef.current = next;
    setLayout(next);
    persist("layout", next);
  };
  function undo(redo = false) {
    const source = redo ? history.future : history.past;
    if (!source.length) return;
    const snapshot = source.at(-1),
      current = { map: clone(map), layout: clone(layout), expanded, focused };
    before.current = motion.capture();
    setHistory(
      redo
        ? {
            past: [...history.past, current],
            future: history.future.slice(0, -1),
          }
        : {
            past: history.past.slice(0, -1),
            future: [...history.future, current],
          },
    );
    setMap(snapshot.map);
    setLayout(snapshot.layout);
    setExpanded(snapshot.expanded);
    setFocused(snapshot.focused);
    persist("map", snapshot.map);
    persist("layout", snapshot.layout);
    notify(redo ? "Change restored" : "Change undone");
  }
  const focusContextValue = focusContext(map, focused);
  const { positions, placed } = arrange(
    map,
    layout,
    expanded,
    dimensions,
    columnDrag,
    focused
      ? {
          id: focusContextValue.objects.has(focusAnchor) ? focusAnchor : focused,
          visible: focusContextValue.objects,
        }
      : null,
  );
  useLayoutEffect(() => {
    if (!loaded || !map.objects.length) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const visible = [...canvasRef.current.querySelectorAll('.object-card')].some((card) => {
      const rect = card.getBoundingClientRect();
      return rect.right > bounds.left && rect.left < bounds.right &&
        rect.bottom > bounds.top && rect.top < bounds.bottom;
    });
    if (!visible) fit();
  }, [loaded]);
  useLayoutEffect(() => {
    if (before.current) {
      motion.reflow(before.current, treatment);
      before.current = null;
    }
  }, [map, layout, expanded, showStates, showEvidence]);
  function selectObject(id, anchor = id) {
    if (dragged.current) return;
    setSelectedItem(null);
    setFocusAnchor(anchor);
    setFocused(id);
    setExpanded((previous) =>
      previous.includes(id) ? previous : [...previous, id],
    );
  }
  function focus(id) {
    const next = expanded.includes(id)
      ? expanded.filter((x) => x !== id)
      : [...expanded, id];
    setExpanded(next);
    if (focused === id && !next.includes(id)) setFocused(null);
  }
  function traverse(id, from) {
    selectObject(id, from ?? id);
  }
  function revealComposer(element) {
    if (!element || !canvasRef.current) return;
    const bounds = element.getBoundingClientRect();
    const canvas = canvasRef.current.getBoundingClientRect();
    const viewport = layoutRef.current.viewport;
    const right = canvas.right - (panel ? 420 : 24);
    const top = canvas.top + 80;
    const bottom = canvas.bottom - 110;
    let { x, y } = viewport;
    if (bounds.left < canvas.left + 24) x += canvas.left + 24 - bounds.left;
    else if (bounds.right > right) x += right - bounds.right;
    if (bounds.top < top) y += top - bounds.top;
    else if (bounds.bottom > bottom) y += bottom - bounds.bottom;
    if (x !== viewport.x || y !== viewport.y) {
      setCameraMotion(true);
      setView({ ...layoutRef.current, viewport: { ...viewport, x, y } });
    }
  }
  function promoteAttribute(objectId, attributeId) {
    const result = promote(map, objectId, attributeId),
      p = positions[objectId];
    const nextLayout = {
      ...layout,
      positions: {
        ...layout.positions,
        [result.object.id]: { x: p.x + COLUMN_STEP / 2, y: p.y },
      },
    };
    change(result.map, {
      layout: nextLayout,
      expanded: [...expanded, result.object.id],
      focused: objectId,
    });
    setNameRelationship(result.relationship.id);
    notify(
      `${result.object.name} is now an object. A relationship connects it to its origin.`,
    );
  }
  function demoteObject(id) {
    try {
      const next = demote(map, id);
      change(next, {
        expanded: expanded.filter((x) => x !== id),
        focused: map.objects.find((o) => o.id === id)?.promotedFrom.objectId,
      });
      notify("Object returned to its original attribute");
    } catch (e) {
      notify(e.message);
    }
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(
        text.startsWith("obj:") ? `@object-map ${text}` : text,
      );
      notify("Copied for your coding agent");
    } catch {
      notify("Clipboard unavailable. Use Export to save the context.");
    }
  }
  function createObject(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const object = makeObject(map, newName.trim());
    const bounds = canvasRef.current.getBoundingClientRect(),
      v = layout.viewport;
    const nextLayout = {
      ...layout,
      positions: {
        ...layout.positions,
        [object.id]: {
          x: (bounds.width / 2 - v.x) / v.zoom,
          y: (180 - v.y) / v.zoom,
        },
      },
    };
    change(
      { ...map, objects: [...map.objects, object] },
      {
        layout: nextLayout,
        expanded: [...expanded, object.id],
        focused: object.id,
      },
    );
    setNewName("");
    setCreating(false);
    notify(`${object.name} added to your map`);
  }
  function onDrag(e, id) {
    if (e.button !== 0 || !e.isPrimary || activeDrag.current) return;
    e.preventDefault();
    e.stopPropagation();
    setCameraMotion(false);
    clearTimeout(settleTimer.current);
    setColumnSettling(false);
    const el = e.currentTarget, pointerId = e.pointerId;
    const origin = { x: e.clientX, y: e.clientY };
    const originalLayout = layoutRef.current;
    const start = positions[id], viewport = originalLayout.viewport;
    const order = columnOrder(map, layout);
    let moved = false, frame = null, point = start, nextOrder = order;
    let pointer = origin, lastTime = performance.now(), renderedPoint = null;
    const track = time => {
      const bounds = canvasRef.current.getBoundingClientRect();
      const current = layoutRef.current;
      const edge = 48, right = bounds.right - (panel ? 420 : 0);
      const speed = pointer.x < bounds.left + edge
        ? Math.min(1, (bounds.left + edge - pointer.x) / edge)
        : pointer.x > right - edge ? -Math.min(1, (pointer.x - right + edge) / edge) : 0;
      const delta = speed * 650 * Math.min(32, time - lastTime) / 1000;
      lastTime = time;
      if (delta) {
        const minX = Math.min(viewport.x, right - bounds.left - order.length * COLUMN_STEP * viewport.zoom - 40);
        const maxX = Math.max(viewport.x, 80);
        const x = Math.max(minX, Math.min(maxX, current.viewport.x + delta));
        if (x !== current.viewport.x) {
          const next = {...current, viewport:{...current.viewport,x}};
          layoutRef.current = next;
          setLayout(next);
        }
      }
      point = {
        x: start.x + (pointer.x - origin.x + viewport.x - layoutRef.current.viewport.x) / viewport.zoom,
        y: start.y + (pointer.y - origin.y) / viewport.zoom,
      };
      nextOrder = reorderColumns(order, id, point.x);
      if (!renderedPoint || point.x !== renderedPoint.x || point.y !== renderedPoint.y) {
        setColumnDrag({ id, point, order: nextOrder });
        renderedPoint = point;
      }
      frame = requestAnimationFrame(track);
    };
    const update = event => {
      const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      if (!moved) {
        el.setPointerCapture(pointerId);
        lastTime = performance.now();
        frame = requestAnimationFrame(track);
      }
      moved = true;
      dragged.current = true;
      pointer = { x: event.clientX, y: event.clientY };
      point = { x: start.x + (dx + viewport.x - layoutRef.current.viewport.x) / viewport.zoom, y: start.y + dy / viewport.zoom };
      nextOrder = reorderColumns(order, id, point.x);
    };
    const move = event => { if (event.pointerId === pointerId) update(event); };
    const finish = (cancelled = false) => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", cancel);
      el.removeEventListener("lostpointercapture", cancel);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", cancel);
      activeDrag.current = null;
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      if (moved) {
        setColumnSettling(true);
        if (!cancelled) setView({ ...layoutRef.current, positions: positionsForOrder(nextOrder) });
        else {
          layoutRef.current = originalLayout;
          setLayout(originalLayout);
        }
        settleTimer.current = setTimeout(() => setColumnSettling(false), 200);
      } else if (!cancelled) selectObject(id);
      setColumnDrag(null);
      setTimeout(() => (dragged.current = false), 0);
    };
    const stop = event => {
      if (event.pointerId !== pointerId) return;
      update(event);
      finish();
    };
    const cancel = event => {
      if (event?.pointerId !== undefined && event.pointerId !== pointerId) return;
      finish(true);
    };
    const key = event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    };
    activeDrag.current = { cancel };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", cancel);
    el.addEventListener("lostpointercapture", cancel);
    document.addEventListener("keydown", key, true);
    window.addEventListener("blur", cancel);
  }
  function pan(e) {
    if ((e.button !== 0 && e.button !== 1) || !e.isPrimary) return;
    if (
      e.target.closest(
        "button,input,select,textarea,article,aside,.canvas-actions,.canvas-toolbar,.search-popover,.new-object-popover",
      )
    )
      return;
    e.preventDefault();
    setCameraMotion(false);
    const el = e.currentTarget,
      origin = { x: e.clientX, y: e.clientY },
      v = layout.viewport;
    el.setPointerCapture(e.pointerId);
    el.classList.add("panning");
    let moved = false;
    const move = (event) => {
      if (
        !moved &&
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 5
      )
        return;
      moved = true;
      setLayout((prev) => ({
        ...prev,
        viewport: {
          ...v,
          x: v.x + event.clientX - origin.x,
          y: v.y + event.clientY - origin.y,
        },
      }));
    };
    const stop = (event) => {
      el.classList.remove("panning");
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", stop);
      el.removeEventListener("pointercancel", stop);
      if (moved) persist("layout", layoutRef.current);
      else if (event.type !== "pointercancel") {
        setFocused(null);
        setSelectedItem(null);
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
  }
  function zoom(amount, point) {
    setCameraMotion(false);
    const v = layoutRef.current.viewport,
      rect = canvasRef.current.getBoundingClientRect(),
      p = point || { x: rect.width / 2, y: rect.height / 2 },
      z = Math.max(0.25, Math.min(1.6, v.zoom * amount));
    setView({
      ...layoutRef.current,
      viewport: {
        zoom: z,
        x: p.x - ((p.x - v.x) * z) / v.zoom,
        y: p.y - ((p.y - v.y) * z) / v.zoom,
      },
    });
  }
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const wheel = (e) => {
      if (e.target.closest("aside,.search-popover,.new-object-popover,.item-composer,.relationship-editor,.context-menu,.object-type-menu,.canvas-toolbar,.canvas-actions")) return;
      e.preventDefault();
      if (activeDrag.current) return;
      setCameraMotion(false);
      const rect = el.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
      zoom(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.008 : 0.002)), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [loaded]);
  function fit(closePanel = false) {
    before.current = motion.capture();
    if (!placed.length) return;
    const rect = canvasRef.current.getBoundingClientRect(),
      minX = Math.min(...placed.map((p) => p.x)),
      minY = Math.min(...placed.map((p) => p.y)),
      maxX = Math.max(...placed.map((p) => p.x + p.width)),
      maxY = Math.max(...placed.map((p) => p.y + p.height)),
      panelWidth = closePanel ? 0 : canvasRef.current.querySelector('aside')?.offsetWidth || 0,
      w = Math.max(250, rect.width - panelWidth - 100),
      h = rect.height - 160,
      z = Math.max(0.25, Math.min(1, w / (maxX - minX), h / (maxY - minY)));
    setView({
      ...layout,
      viewport: {
        zoom: z,
        x: 50 - minX * z + (w - (maxX - minX) * z) / 2,
        y: 80 - minY * z,
      },
    });
  }
  const changes = base.current ? changesBetween(base.current, map) : [];
  function exportContext() {
    const content = JSON.stringify({ map, changes }, null, 2),
      url = URL.createObjectURL(
        new Blob([content], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "object-map-context.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Map context exported");
  }
  useEffect(() => {
    const key = (e) => {
      if (e.target.closest("input,textarea,select,[contenteditable]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo(e.shiftKey);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPanel(null);
        setCreating(false);
        setSearchOpen(false);
        setFocused(null);
        setSelectedItem(null);
      }
      if (e.key === "f") fit();
      if (e.key === "n") setCreating(true);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [history, map, layout, expanded, panel]);
  if (loadError)
    return (
      <div className="fatal">
        <Layers size={28} />
        <h1>Couldn’t open the repository</h1>
        <p>{loadError}</p>
        <button className="primary" onClick={() => location.reload()}>
          Try again
        </button>
        <p>
          Run <code>npm run dev</code> to prepare the local Atlas workspace.
        </p>
      </div>
    );
  if (!loaded)
    return (
      <div className="fatal">
        <Layers size={28} />
        <p>Opening your product landscape…</p>
      </div>
    );
  const v = layout.viewport || initialLayout.viewport;
  const context = focusContextValue;
  return (
    <div className="app-shell" ref={shellRef} data-save-state={saveStatus}>
      <header className="app-header">
        <a className="brand" href="/" aria-label="Object Map home">
          <span className="brand-mark">
            <Layers size={20} />
          </span>
          Object Map
        </a>
        <button
          className="workspace-name"
          onClick={() => setPanel(panel === "about" ? null : "about")}
        >
          {config.name.charAt(0).toUpperCase() + config.name.slice(1)}
          <span className="beta">Local</span>
          <ChevronDown size={13} />
        </button>
        <div className="header-right">
          <button
            className={`quiet-button ${panel === "changes" ? "active" : ""}`}
            onClick={() => setPanel(panel === "changes" ? null : "changes")}
          >
            <GitBranch size={15} />
            Session changes
            {changes.length > 0 && (
              <span className="count-badge">{changes.length}</span>
            )}
          </button>
          <button
            className="primary new-object-button"
            onClick={() => setCreating(!creating)}
          >
            <Plus size={16} />
            New object
          </button>
        </div>
      </header>
      <main
        className="canvas"
        ref={canvasRef}
        onPointerDown={pan}
        onDoubleClick={(e) => {
          if (activeDrag.current || e.target.closest('button,input,select,textarea,article,aside,.canvas-actions,.canvas-toolbar,.search-popover,.new-object-popover')) return;
          e.preventDefault();
          const rect = canvasRef.current.getBoundingClientRect();
          zoom(e.shiftKey ? 1 / 1.5 : 1.5, { x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        style={{
          backgroundPosition: `${v.x}px ${v.y}px`,
          backgroundSize: `${24 * v.zoom}px ${24 * v.zoom}px`,
        }}
      >
        {(focused || selectedItem) && (
            <button className="clear-focus" onClick={() => {setFocused(null); setSelectedItem(null);}}>
              <X size={12} />
              Clear selection
            </button>
        )}
        <div className="canvas-actions">
          <IconButton
            icon={Search}
            label="Find an object (⌘K)"
            onClick={() => setSearchOpen(!searchOpen)}
          />
          <IconButton
            icon={Settings}
            label="Canvas settings"
            onClick={() => setPanel(panel === "settings" ? null : "settings")}
          />
        </div>
        {searchOpen && (
          <div className="search-popover">
            <div>
              <Search size={15} />
              <input
                autoFocus
                placeholder="Find an object…"
                aria-label="Find an object"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <IconButton
                icon={X}
                label="Close search"
                onClick={() => setSearchOpen(false)}
              />
            </div>
            {map.objects
              .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    traverse(o.id);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <Layers size={14} />
                  {o.name}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {!map.objects.some((o) =>
              o.name.toLowerCase().includes(query.toLowerCase()),
            ) && <p>No objects match “{query}”.</p>}
          </div>
        )}
        <div
          className="world"
          data-camera-motion={cameraMotion}
          data-column-motion={!!columnDrag || columnSettling || focusMotion}
          data-zoom={v.zoom}
          style={{ transform: `translate(${v.x}px,${v.y}px) scale(${v.zoom})` }}
        >
          {columnDrag && <div className="column-drop-slot" aria-hidden="true" style={{
            left: columnDrag.order.indexOf(columnDrag.id) * COLUMN_STEP,
            height: dimensions[`${columnDrag.id}:${expanded.includes(columnDrag.id)}`] || 100,
          }} />}
          {map.objects.map((object, index) => (
            <ObjectCard
              key={object.id}
              object={object}
              index={index}
              expanded={expanded.includes(object.id)}
              focused={focused === object.id}
              dimmed={!!focused && !context.objects.has(object.id)}
              related={
                !!focused &&
                focused !== object.id &&
                context.objects.has(object.id)
              }
              relevantRelationships={context.relationships}
              onSelect={selectObject}
              position={positions[object.id]}
              dragging={columnDrag?.id === object.id}
              map={map}
              onToggle={focus}
              onChange={change}
              onPromote={(objectId, attributeId) => {
                const parent = map.objects.find((o) => o.id === objectId);
                const attribute = parent.attributes.find((a) => a.id === attributeId);
                setConfirm({
                  title: `Make ${attribute.name} its own object?`,
                  body: `${attribute.name} becomes a column beside ${parent.name}, and ${parent.name} keeps a link to it instead of the field. Do this when the thing has its own identity and other objects need to refer to it — not just because the field matters.`,
                  confirmLabel: "Promote to object",
                  run: () => promoteAttribute(objectId, attributeId),
                });
              }}
              nameRelationship={nameRelationship}
              onNamedRelationship={() => setNameRelationship(null)}
              onDemote={(id) => {
                const target = map.objects.find((o) => o.id === id);
                setConfirm({
                  title: `Return ${target.name} to an attribute?`,
                  body: `The column closes and ${target.name} goes back to being a field on the object it came from. Only possible while nothing has been added to it and nothing else links to it.`,
                  confirmLabel: "Demote to attribute",
                  run: () => demoteObject(id),
                });
              }}
              onDelete={(id) => {
                const target = map.objects.find((o) => o.id === id);
                const inbound = map.objects.flatMap((o) =>
                  o.relationships
                    .filter((r) => r.target === id)
                    .map((r) => `${o.name} — ${r.name}`),
                );
                setConfirm({
                  title: `Delete ${target.name}?`,
                  body: inbound.length
                    ? `Its ${target.attributes.length + target.actions.length + target.states.length} entries go with it, and ${inbound.length} link${inbound.length > 1 ? "s" : ""} into it will be removed: ${inbound.join(", ")}.`
                    : `Its ${target.attributes.length + target.actions.length + target.states.length} entries go with it. Nothing else points at it.`,
                  confirmLabel: "Delete object",
                  tone: "danger",
                  run: () => {
                    change(removeObject(map, id), {
                      expanded: expanded.filter((x) => x !== id),
                      focused: focused === id ? null : focused,
                    });
                    notify("Object and its connections removed. Undo to restore.");
                  },
                });
              }}
              onCopy={copy}
              onTraverse={traverse}
              onDrag={onDrag}
              onSize={onSize}
              onRevealComposer={revealComposer}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              showStates={showStates}
              showEvidence={showEvidence}
              notify={notify}
            />
          ))}
        </div>
        {!map.objects.length && (
          <div className={`empty-state ${panel ? "with-panel" : ""}`}>
            <h2>Nothing mapped yet</h2>
            <section className="run-prompt">
              <header>
                <h3>Agent prompt:</h3>
                <IconButton
                  icon={Copy}
                  label="Copy the agent prompt"
                  onClick={() => copy(RUN_PROMPT)}
                />
              </header>
              <p>{RUN_PROMPT}</p>
            </section>
          </div>
        )}
        {creating && (
          <form className="new-object-popover" onSubmit={createObject}>
            <div className="composer-heading">
              <IconButton
                icon={X}
                label="Cancel new object"
                onClick={() => setCreating(false)}
              />
            </div>
            <label htmlFor="object-name">Give this thing a name.</label>
            <input
              id="object-name"
              autoFocus
              placeholder="Contact, opening hours, a new idea…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <p>Use a noun your product’s users would recognize.</p>
            <button className="primary" disabled={!newName.trim()}>
              Create object <ArrowUpRight size={14} />
            </button>
          </form>
        )}
        <div className="canvas-bottom">
          <div className="legend" aria-label="Color key">
            {sections.map(section => <span key={section}><i className={sectionColors[section]} />{sectionLabels[section]}</span>)}
          </div>
          <div className="canvas-toolbar">
            <IconButton
              icon={Minus}
              label="Zoom out"
              onClick={() => zoom(1 / 1.2)}
            />
            <button
              className="zoom-label"
              onClick={() =>
                setView({ ...layout, viewport: { ...v, zoom: 1 } })
              }
              title="Reset zoom"
            >
              {Math.round(v.zoom * 100)}%
            </button>
            <IconButton icon={Plus} label="Zoom in" onClick={() => zoom(1.2)} />
            <IconButton
              icon={Maximize}
              label="Fit all objects (F)"
              onClick={() => fit()}
            />
            <span className="toolbar-divider" />
            <IconButton
              icon={Undo2}
              label="Undo (⌘Z)"
              disabled={!history.past.length}
              onClick={() => undo()}
            />
            <IconButton
              icon={Redo2}
              label="Redo (⇧⌘Z)"
              disabled={!history.future.length}
              onClick={() => undo(true)}
            />
          </div>
        </div>
        {confirm && (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
        />
      )}
      {guide && (
        <Guide
          onClose={() => {
            setGuide(false);
            try { localStorage.setItem("object-map-guide", "seen"); } catch {}
          }}
        />
      )}
      {panel && (
          <aside className="side-panel">
            <div className="panel-heading">
              <IconButton
                icon={X}
                label="Close panel"
                onClick={() => setPanel(null)}
              />
            </div>
            {panel === "changes" ? (
              <>
                <h2>Session changes</h2>
                <div className="change-list">
                  {changes.length ? (
                    changes.map((c, i) => <div key={i}>{c}</div>)
                  ) : (
                    <div className="muted">No semantic changes this session.</div>
                  )}
                </div>
                <button
                  className="primary"
                  disabled={!changes.length}
                  onClick={() =>
                    copy(
                      `Object Map — session changes\n\n${changes.join("\n")}\n\nRead .object-map/map.json for the current model.`,
                    )
                  }
                >
                  <Copy size={15} />
                  Copy session changes
                </button>
                <button className="secondary" onClick={exportContext}>
                  <Download size={15} />
                  Export map context
                </button>
              </>
            ) : panel === "settings" ? (
              <>
                <h2>Canvas settings</h2>
                <div className="setting-group">
                  <h3>Display</h3>
                  <label className="setting">
                    <span>Optional states</span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={showStates}
                      onChange={(e) => {
                        before.current = motion.capture();
                        setShowStates(e.target.checked);
                      }}
                    />
                  </label>
                  <label className="setting">
                    <span>Implementation evidence</span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={showEvidence}
                      onChange={(e) => setShowEvidence(e.target.checked)}
                    />
                  </label>
                </div>
                <div className="setting-group">
                  <h3 id="appearance-label">Appearance</h3>
                  <div className="options" role="group" aria-labelledby="appearance-label">
                    {[["system", "System"], ["light", "Light"], ["dark", "Dark"]].map(([key, label]) => (
                      <button
                        className={theme === key ? "selected" : ""}
                        aria-pressed={theme === key}
                        key={key}
                        onClick={() => setTheme(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-group motion-settings">
                  <h3 id="motion-label">Motion</h3>
                  <div className="options" role="group" aria-labelledby="motion-label">
                    {Object.entries(treatments).map(([key, value]) => (
                      <button
                        className={treatment === key ? "selected" : ""}
                        aria-pressed={treatment === key}
                        key={key}
                        onClick={() => setTreatment(key)}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2>
                  {config.name.charAt(0).toUpperCase() + config.name.slice(1)}
                </h2>
                <button className="secondary" disabled={!map.objects.length} onClick={() => {
                  setPanel(null);
                  setFocused(null);
                  fit(true);
                }}>
                  <Maximize size={15} />Show saved map
                </button>
                <div className="workspace-detail">
                  <span>Repository</span>
                  <code>{repository}</code>
                  <span>Model</span>
                  <code>.object-map/map.json</code>
                  <span>Layout</span>
                  <code>.object-map/layout.json</code>
                </div>
                <button className="secondary" onClick={exportContext}>
                  <Download size={15} />
                  Export map context
                </button>
              </>
            )}
          </aside>
        )}
      </main>
      {saveError && (
        <div className="save-error" role="alert">
          {saveError}
          <button onClick={flush}>Retry save</button>
          <button onClick={exportContext}>Export unsaved work</button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
