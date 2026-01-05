import { useState, useEffect, useCallback, createContext } from "react";
import ControlPanel from "./EditorHeader/ControlPanel";
import Canvas from "./EditorCanvas/Canvas";
import { CanvasContextProvider } from "../context/CanvasContext";
import SidePanel from "./EditorSidePanel/SidePanel";
import { DB, State } from "../data/constants";
import { db } from "../data/db";
import {
  useLayout,
  useSettings,
  useTransform,
  useDiagram,
  useUndoRedo,
  useAreas,
  useNotes,
  useTypes,
  useTasks,
  useSaveState,
  useEnums,
  useAuth,
} from "../hooks";
import FloatingControls from "./FloatingControls";
import { Button, Modal, Tag, Toast } from "@douyinfe/semi-ui";
import { IconAlertTriangle } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { databases } from "../data/databases";
import { isRtl } from "../i18n/utils/rtl";
import { useSearchParams } from "react-router-dom";
import { get, SHARE_FILENAME } from "../api/gists";
import { nanoid } from "nanoid";
import { diagramAPI } from "../api/backend";
import ConflictDialog from "./ConflictDialog";

export const IdContext = createContext({
  gistId: "",
  setGistId: () => {},
  version: "",
  setVersion: () => {},
});

const SIDEPANEL_MIN_WIDTH = 384;

export default function WorkSpace() {
  const [id, setId] = useState(0);
  const [gistId, setGistId] = useState("");
  const [version, setVersion] = useState("");
  const [loadedFromGistId, setLoadedFromGistId] = useState("");
  const [title, setTitle] = useState("Untitled Diagram");
  const [resize, setResize] = useState(false);
  const [width, setWidth] = useState(SIDEPANEL_MIN_WIDTH);
  const [lastSaved, setLastSaved] = useState("");
  const [showSelectDbModal, setShowSelectDbModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedDb, setSelectedDb] = useState("");
  const { layout, setLayout } = useLayout();
  const { settings } = useSettings();
  const { types, setTypes } = useTypes();
  const { areas, setAreas } = useAreas();
  const { tasks, setTasks } = useTasks();
  const { notes, setNotes } = useNotes();
  const { saveState, setSaveState } = useSaveState();
  const { transform, setTransform } = useTransform();
  const { enums, setEnums } = useEnums();
  const {
    tables,
    relationships,
    setTables,
    setRelationships,
    database,
    setDatabase,
  } = useDiagram();
  const { undoStack, redoStack, setUndoStack, setRedoStack } = useUndoRedo();
  const { t, i18n } = useTranslation();
  let [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [currentVersion, setCurrentVersion] = useState(1);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const handleResize = (e) => {
    if (!resize) return;
    const w = isRtl(i18n.language) ? window.innerWidth - e.clientX : e.clientX;
    if (w > SIDEPANEL_MIN_WIDTH) setWidth(w);
  };

  const save = useCallback(async () => {
    const name = window.name.split(" ");
    const op = name[0];
    const saveAsDiagram = window.name === "" || op === "d" || op === "lt";

    if (saveAsDiagram) {
      if (searchParams.has("shareId")) {
        searchParams.delete("shareId");
        setSearchParams(searchParams, { replace: true });
      }

      // Authentication required - save to backend only
      if (!isAuthenticated) {
        setSaveState(State.ERROR);
        Toast.error("Please log in to save diagrams");
        return;
      }

      const diagramData = {
        database: database,
        name: title,
        gistId: gistId ?? "",
        lastModified: new Date(),
        tables: tables,
        references: relationships,
        notes: notes,
        areas: areas,
        todos: tasks,
        pan: transform.pan,
        zoom: transform.zoom,
        loadedFromGistId: loadedFromGistId,
        expectedVersion: currentVersion,
        ...(databases[database].hasEnums && { enums: enums }),
        ...(databases[database].hasTypes && { types: types }),
      };

      try {
        setSaveState(State.SAVING);

        if ((id === 0 && window.name === "") || op === "lt") {
          // Create new diagram
          const newDiagram = await diagramAPI.create(diagramData);
          setId(newDiagram.id);
          setCurrentVersion(newDiagram.version);
          window.name = `d ${newDiagram.id}`;
          setSaveState(State.SAVED);
          setLastSaved(new Date().toLocaleString());
        } else {
          // Update existing diagram
          const updatedDiagram = await diagramAPI.update(id, diagramData);
          setCurrentVersion(updatedDiagram.version);
          setSaveState(State.SAVED);
          setLastSaved(new Date().toLocaleString());
        }
      } catch (error) {
        console.error("Save failed:", error);

        if (error.response?.status === 409) {
          // Conflict detected
          setConflictData({
            localChanges: diagramData,
            serverVersion: error.response.data.currentVersion,
          });
          setShowConflictDialog(true);
          setSaveState(State.ERROR);
        } else {
          setSaveState(State.ERROR);
          Toast.error(
            error.response?.data?.message || "Failed to save diagram",
          );
        }
      }
    } else {
      // Template saving (IndexedDB)
      await db.templates
        .update(id, {
          database: database,
          title: title,
          tables: tables,
          relationships: relationships,
          notes: notes,
          subjectAreas: areas,
          todos: tasks,
          pan: transform.pan,
          zoom: transform.zoom,
          ...(databases[database].hasEnums && { enums: enums }),
          ...(databases[database].hasTypes && { types: types }),
        })
        .then(() => {
          setSaveState(State.SAVED);
          setLastSaved(new Date().toLocaleString());
        })
        .catch(() => {
          setSaveState(State.ERROR);
        });
    }
  }, [
    searchParams,
    setSearchParams,
    tables,
    relationships,
    notes,
    areas,
    types,
    title,
    id,
    tasks,
    transform,
    setSaveState,
    database,
    enums,
    gistId,
    loadedFromGistId,
    isAuthenticated,
    currentVersion,
  ]);

  const load = useCallback(async () => {
    const loadLatestDiagram = async () => {
      // Fetch from backend if authenticated
      if (isAuthenticated) {
        try {
          const { ownDiagrams, sharedDiagrams } = await diagramAPI.getAll();
          const allDiagrams = [...ownDiagrams, ...sharedDiagrams];

          if (allDiagrams.length > 0) {
            // Sort by lastModified and get the latest
            const latest = allDiagrams.sort(
              (a, b) =>
                new Date(b.lastModified || b.updatedAt) -
                new Date(a.lastModified || a.updatedAt)
            )[0];

            if (latest.database) {
              setDatabase(latest.database);
            } else {
              setDatabase(DB.GENERIC);
            }
            setId(latest.id);
            setGistId(latest.gistId);
            setLoadedFromGistId(latest.loadedFromGistId);
            setTitle(latest.name);
            setTables(latest.tables || []);
            setRelationships(latest.references || []);
            setNotes(latest.notes || []);
            setAreas(latest.areas || []);
            setTasks(latest.todos ?? []);
            setTransform({
              pan: latest.pan || { x: 0, y: 0 },
              zoom: latest.zoom || 1.0,
            });
            setCurrentVersion(latest.version || 1);
            if (databases[latest.database].hasTypes) {
              if (latest.types) {
                setTypes(
                  latest.types.map((t) =>
                    t.id
                      ? t
                      : {
                          ...t,
                          id: nanoid(),
                          fields: t.fields.map((f) =>
                            f.id ? f : { ...f, id: nanoid() },
                          ),
                        },
                  ),
                );
              } else {
                setTypes([]);
              }
            }
            if (databases[latest.database].hasEnums) {
              setEnums(
                latest.enums?.map((e) => (!e.id ? { ...e, id: nanoid() } : e)) ?? [],
              );
            }
            window.name = `d ${latest.id}`;
          } else {
            window.name = "";
            if (selectedDb === "") setShowSelectDbModal(true);
          }
        } catch (error) {
          console.error("Failed to load diagrams from backend:", error);
          window.name = "";
          if (selectedDb === "") setShowSelectDbModal(true);
        }
      } else {
        // Not authenticated - show select database modal
        window.name = "";
        if (selectedDb === "") setShowSelectDbModal(true);
      }
    };

    const loadDiagram = async (id) => {
      // Fetch specific diagram from backend if authenticated
      if (isAuthenticated) {
        try {
          const diagram = await diagramAPI.getById(id);
          
          if (diagram.database) {
            setDatabase(diagram.database);
          } else {
            setDatabase(DB.GENERIC);
          }
          setId(diagram.id);
          setGistId(diagram.gistId);
          setLoadedFromGistId(diagram.loadedFromGistId);
          setTitle(diagram.name);
          setTables(diagram.tables || []);
          setRelationships(diagram.references || []);
          setAreas(diagram.areas || []);
          setNotes(diagram.notes || []);
          setTasks(diagram.todos ?? []);
          setTransform({
            pan: diagram.pan || { x: 0, y: 0 },
            zoom: diagram.zoom || 1.0,
          });
          setCurrentVersion(diagram.version || 1);
          setUndoStack([]);
          setRedoStack([]);
          if (databases[diagram.database].hasTypes) {
            if (diagram.types) {
              setTypes(
                diagram.types.map((t) =>
                  t.id
                    ? t
                    : {
                        ...t,
                        id: nanoid(),
                        fields: t.fields.map((f) =>
                          f.id ? f : { ...f, id: nanoid() },
                        ),
                      },
                ),
              );
            } else {
              setTypes([]);
            }
          }
          if (databases[diagram.database].hasEnums) {
            setEnums(
              diagram.enums?.map((e) =>
                !e.id ? { ...e, id: nanoid() } : e,
              ) ?? [],
            );
          }
          window.name = `d ${diagram.id}`;
        } catch (error) {
          console.error("Failed to load diagram from backend:", error);
          window.name = "";
        }
      } else {
        window.name = "";
      }
    };

    const loadTemplate = async (id) => {
      await db.templates
        .get(id)
        .then((diagram) => {
          if (diagram) {
            if (diagram.database) {
              setDatabase(diagram.database);
            } else {
              setDatabase(DB.GENERIC);
            }
            setId(diagram.id);
            setTitle(diagram.title);
            setTables(diagram.tables);
            setRelationships(diagram.relationships);
            setAreas(diagram.subjectAreas);
            setTasks(diagram.todos ?? []);
            setNotes(diagram.notes);
            setTransform({
              zoom: 1,
              pan: { x: 0, y: 0 },
            });
            setUndoStack([]);
            setRedoStack([]);
            if (databases[database].hasTypes) {
              if (diagram.types) {
                setTypes(
                  diagram.types.map((t) =>
                    t.id
                      ? t
                      : {
                          ...t,
                          id: nanoid(),
                          fields: t.fields.map((f) =>
                            f.id ? f : { ...f, id: nanoid() },
                          ),
                        },
                  ),
                );
              } else {
                setTypes([]);
              }
            }
            if (databases[database].hasEnums) {
              setEnums(
                diagram.enums.map((e) =>
                  !e.id ? { ...e, id: nanoid() } : e,
                ) ?? [],
              );
            }
          } else {
            if (selectedDb === "") setShowSelectDbModal(true);
          }
        })
        .catch((error) => {
          console.log(error);
          if (selectedDb === "") setShowSelectDbModal(true);
        });
    };

    const loadFromGist = async (shareId) => {
      try {
        const { data } = await get(shareId);
        const parsedDiagram = JSON.parse(data.files[SHARE_FILENAME].content);
        setUndoStack([]);
        setRedoStack([]);
        setGistId(shareId);
        setLoadedFromGistId(shareId);
        setDatabase(parsedDiagram.database);
        setTitle(parsedDiagram.title);
        setTables(parsedDiagram.tables);
        setRelationships(parsedDiagram.relationships);
        setNotes(parsedDiagram.notes);
        setAreas(parsedDiagram.subjectAreas);
        setTransform(parsedDiagram.transform);
        if (databases[parsedDiagram.database].hasTypes) {
          if (parsedDiagram.types) {
            setTypes(
              parsedDiagram.types.map((t) =>
                t.id
                  ? t
                  : {
                      ...t,
                      id: nanoid(),
                      fields: t.fields.map((f) =>
                        f.id ? f : { ...f, id: nanoid() },
                      ),
                    },
              ),
            );
          } else {
            setTypes([]);
          }
        }
        if (databases[parsedDiagram.database].hasEnums) {
          setEnums(
            parsedDiagram.enums.map((e) =>
              !e.id ? { ...e, id: nanoid() } : e,
            ) ?? [],
          );
        }
      } catch (e) {
        console.log(e);
        setSaveState(State.FAILED_TO_LOAD);
      }
    };

    const shareId = searchParams.get("shareId");
    if (shareId) {
      // Check if diagram from this gist already exists in backend
      if (isAuthenticated) {
        try {
          const { ownDiagrams } = await diagramAPI.getAll();
          const existingDiagram = ownDiagrams.find(
            (d) => d.loadedFromGistId === shareId
          );

          if (existingDiagram) {
            window.name = "d " + existingDiagram.id;
            setId(existingDiagram.id);
          } else {
            window.name = "";
            setId(0);
          }
        } catch (error) {
          console.error("Failed to check existing diagrams:", error);
          window.name = "";
          setId(0);
        }
      } else {
        window.name = "";
        setId(0);
      }
      await loadFromGist(shareId);
      return;
    }

    if (window.name === "") {
      await loadLatestDiagram();
    } else {
      const name = window.name.split(" ");
      const op = name[0];
      const id = name[1]; // Keep as string for UUIDs (diagrams) or templates
      switch (op) {
        case "d": {
          await loadDiagram(id); // ID is a UUID string
          break;
        }
        case "t":
        case "lt": {
          await loadTemplate(parseInt(id)); // Templates use integer IDs
          break;
        }
        default:
          break;
      }
    }
  }, [
    setTransform,
    setRedoStack,
    setUndoStack,
    setRelationships,
    setTables,
    setAreas,
    setNotes,
    setTypes,
    setTasks,
    setDatabase,
    database,
    setEnums,
    selectedDb,
    setSaveState,
    searchParams,
    isAuthenticated,
    setCurrentVersion,
    setTitle,
    setId,
    setGistId,
    setLoadedFromGistId,
    setShowSelectDbModal,
  ]);

  const returnToCurrentDiagram = async () => {
    await load();
    setLayout((prev) => ({ ...prev, readOnly: false }));
    setVersion(null);
  };

  useEffect(() => {
    if (
      tables?.length === 0 &&
      areas?.length === 0 &&
      notes?.length === 0 &&
      types?.length === 0 &&
      tasks?.length === 0
    )
      return;

    if (settings.autosave) {
      setSaveState(State.SAVING);
    }
  }, [
    undoStack,
    redoStack,
    settings.autosave,
    tables?.length,
    areas?.length,
    notes?.length,
    types?.length,
    relationships?.length,
    tasks?.length,
    transform.zoom,
    title,
    gistId,
    setSaveState,
  ]);

  useEffect(() => {
    if (layout.readOnly) return;

    if (saveState !== State.SAVING) return;

    save();
  }, [saveState, layout, save]);

  useEffect(() => {
    document.title = "Editor | drawDB";

    load();
  }, [load]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(
    async (resolution) => {
      if (resolution === "keep-server") {
        // Reload the diagram from server
        Toast.info("Reloading diagram from server...");
        setShowConflictDialog(false);
        setConflictData(null);
        await load();
      } else if (resolution === "keep-local") {
        // Force override with local changes
        try {
          const updatedDiagram = await diagramAPI.update(id, {
            ...conflictData.localChanges,
            expectedVersion: conflictData.serverVersion.version,
          });
          setCurrentVersion(updatedDiagram.version);
          setSaveState(State.SAVED);
          setLastSaved(new Date().toLocaleString());
          Toast.success("Your changes have been saved");
          setShowConflictDialog(false);
          setConflictData(null);
        } catch (error) {
          Toast.error("Failed to save changes");
        }
      } else if (resolution === "view-diff") {
        Toast.info("Diff view coming soon");
      }
    },
    [id, conflictData, load, setSaveState],
  );

  // Poll for updates every 30 seconds when authenticated and editing a diagram
  useEffect(() => {
    if (!isAuthenticated || !id || id === 0 || layout.readOnly) return;

    const interval = setInterval(async () => {
      try {
        const versionInfo = await diagramAPI.getVersion(id);

        if (versionInfo.version > currentVersion) {
          Toast.warning({
            content: `Diagram updated by another user. Reload to see changes.`,
            duration: 5,
          });
        }
      } catch (error) {
        // Silently fail - don't disturb the user
        console.error("Version check failed:", error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, id, currentVersion, layout.readOnly]);

  return (
    <div className="h-full flex flex-col overflow-hidden theme">
      <IdContext.Provider value={{ gistId, setGistId, version, setVersion }}>
        <ControlPanel
          diagramId={id}
          setDiagramId={setId}
          title={title}
          setTitle={setTitle}
          lastSaved={lastSaved}
          setLastSaved={setLastSaved}
        />
      </IdContext.Provider>
      <div
        className="flex h-full overflow-y-auto"
        onPointerUp={(e) => e.isPrimary && setResize(false)}
        onPointerLeave={(e) => e.isPrimary && setResize(false)}
        onPointerMove={(e) => e.isPrimary && handleResize(e)}
        onPointerDown={(e) => {
          // Required for onPointerLeave to trigger when a touch pointer leaves
          // https://stackoverflow.com/a/70976017/1137077
          e.target.releasePointerCapture(e.pointerId);
        }}
        style={isRtl(i18n.language) ? { direction: "rtl" } : {}}
      >
        {layout.sidebar && (
          <SidePanel resize={resize} setResize={setResize} width={width} />
        )}
        <div className="relative w-full h-full overflow-hidden">
          <CanvasContextProvider className="h-full w-full">
            <Canvas saveState={saveState} setSaveState={setSaveState} />
          </CanvasContextProvider>
          {version && (
            <div className="absolute right-8 top-2 space-x-2">
              <Button
                icon={<i className="fa-solid fa-rotate-right mt-0.5"></i>}
                onClick={() => setShowRestoreModal(true)}
              >
                {t("restore_version")}
              </Button>
              <Button
                type="tertiary"
                onClick={returnToCurrentDiagram}
                icon={<i className="bi bi-arrow-return-right mt-1"></i>}
              >
                {t("return_to_current")}
              </Button>
            </div>
          )}
          {!(layout.sidebar || layout.toolbar || layout.header) && (
            <div className="fixed right-5 bottom-4">
              <FloatingControls />
            </div>
          )}
        </div>
      </div>
      <Modal
        centered
        size="medium"
        closable={false}
        hasCancel={false}
        title={t("pick_db")}
        okText={t("confirm")}
        visible={showSelectDbModal}
        onOk={() => {
          if (selectedDb === "") return;
          setDatabase(selectedDb);
          setShowSelectDbModal(false);
        }}
        okButtonProps={{ disabled: selectedDb === "" }}
      >
        <div className="grid grid-cols-3 gap-4 place-content-center">
          {Object.values(databases).map((x) => (
            <div
              key={x.name}
              onClick={() => setSelectedDb(x.label)}
              className={`space-y-3 p-3 rounded-md border-2 select-none ${
                settings.mode === "dark"
                  ? "bg-zinc-700 hover:bg-zinc-600"
                  : "bg-zinc-100 hover:bg-zinc-200"
              } ${selectedDb === x.label ? "border-zinc-400" : "border-transparent"}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{x.name}</div>
                {x.beta && (
                  <Tag size="small" color="light-blue">
                    Beta
                  </Tag>
                )}
              </div>
              {x.image && (
                <img
                  src={x.image}
                  className="h-8"
                  style={{
                    filter:
                      "opacity(0.4) drop-shadow(0 0 0 white) drop-shadow(0 0 0 white)",
                  }}
                />
              )}
              <div className="text-xs">{x.description}</div>
            </div>
          ))}
        </div>
      </Modal>
      <Modal
        visible={showRestoreModal}
        centered
        closable
        onCancel={() => setShowRestoreModal(false)}
        title={
          <span className="flex items-center gap-2">
            <IconAlertTriangle className="text-amber-400" size="extra-large" />{" "}
            {t("restore_version")}
          </span>
        }
        okText={t("continue")}
        cancelText={t("cancel")}
        onOk={() => {
          setLayout((prev) => ({ ...prev, readOnly: false }));
          setShowRestoreModal(false);
          setVersion(null);
        }}
      >
        {t("restore_warning")}
      </Modal>
      <ConflictDialog
        visible={showConflictDialog}
        conflictData={conflictData}
        onResolve={handleConflictResolve}
        onClose={() => {
          setShowConflictDialog(false);
          setConflictData(null);
        }}
      />
    </div>
  );
}

