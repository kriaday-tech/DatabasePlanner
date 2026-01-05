import { useState, useEffect } from "react";
import { Banner } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { databases } from "../../../data/databases";
import { diagramAPI } from "../../../api/backend";
import { useAuth } from "../../../hooks";

export default function Open({ selectedDiagramId, setSelectedDiagramId }) {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchDiagrams = async () => {
      if (!isAuthenticated) {
        setDiagrams([]);
        setLoading(false);
        return;
      }

      try {
        const { ownDiagrams, sharedDiagrams } = await diagramAPI.getAll();
        const allDiagrams = [...ownDiagrams, ...sharedDiagrams].map((d) => ({
          ...d,
          lastModified: new Date(d.lastModified || d.updatedAt),
        }));
        setDiagrams(allDiagrams);
      } catch (error) {
        console.error("Failed to fetch diagrams:", error);
        setDiagrams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagrams();
  }, [isAuthenticated]);

  const getDiagramSize = (d) => {
    const size = JSON.stringify(d).length;
    let sizeStr;
    if (size >= 1024 && size < 1024 * 1024)
      sizeStr = (size / 1024).toFixed(1) + "KB";
    else if (size >= 1024 * 1024)
      sizeStr = (size / (1024 * 1024)).toFixed(1) + "MB";
    else sizeStr = size + "B";

    return sizeStr;
  };
  if (loading) {
    return <div className="text-center py-4">{t("loading") || "Loading..."}</div>;
  }

  return (
    <div>
      {diagrams.length === 0 ? (
        <Banner
          fullMode={false}
          type="info"
          bordered
          icon={null}
          closeIcon={null}
          description={<div>{isAuthenticated ? t("no_saved_diagrams") : t("login_to_view_diagrams") || "Please log in to view your diagrams"}</div>}
        />
      ) : (
        <div className="max-h-[360px]">
          <table className="w-full text-left border-separate border-spacing-x-0">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("last_modified")}</th>
                <th>{t("size")}</th>
                <th>{t("type")}</th>
              </tr>
            </thead>
            <tbody>
              {diagrams?.map((d) => {
                return (
                  <tr
                    key={d.id}
                    className={`${
                      selectedDiagramId === d.id ? "bg-blue-300/30" : "hover-1"
                    }`}
                    onClick={() => {
                      setSelectedDiagramId(d.id);
                    }}
                  >
                    <td className="py-1">
                      <i className="bi bi-file-earmark-text text-[16px] me-1 opacity-60" />
                      {d.name}
                    </td>
                    <td className="py-1">
                      {d.lastModified.toLocaleDateString() +
                        " " +
                        d.lastModified.toLocaleTimeString()}
                    </td>
                    <td className="py-1">{getDiagramSize(d)}</td>
                    <td className="py-1">
                      {databases[d.database].name ?? "Generic"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
