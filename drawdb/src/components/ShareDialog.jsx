import { useState, useEffect } from "react";
import { Modal, Form, Select, Button, Toast, List } from "@douyinfe/semi-ui";
import { diagramAPI } from "../api/backend";

export default function ShareDialog({ visible, diagramId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState([]);

  const handleShare = async (values) => {
    setLoading(true);
    try {
      await diagramAPI.share(
        diagramId,
        values.userId,
        values.permissionLevel,
      );
      Toast.success("Diagram shared successfully");
      loadShares();
    } catch (error) {
      Toast.error(
        error.response?.data?.message || "Failed to share diagram",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadShares = async () => {
    if (!diagramId) return;
    try {
      const data = await diagramAPI.getShares(diagramId);
      setShares(data);
    } catch (error) {
      console.error("Failed to load shares:", error);
    }
  };

  const handleRevokeShare = async (userId) => {
    try {
      await diagramAPI.revokeShare(diagramId, userId);
      Toast.success("Access revoked successfully");
      loadShares();
    } catch (error) {
      Toast.error("Failed to revoke access");
    }
  };

  useEffect(() => {
    if (visible && diagramId) {
      loadShares();
    }
  }, [visible, diagramId]);

  return (
    <Modal
      title="Share Diagram"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form onSubmit={handleShare} layout="vertical">
        <Form.Input
          field="userId"
          label="User ID or Email"
          placeholder="Enter user ID or email"
          rules={[{ required: true, message: "User ID or email is required" }]}
        />

        <Form.Select
          field="permissionLevel"
          label="Permission Level"
          defaultValue="viewer"
          rules={[{ required: true }]}
        >
          <Select.Option value="viewer">Viewer (Read Only)</Select.Option>
          <Select.Option value="editor">
            Editor (Can Modify)
          </Select.Option>
          <Select.Option value="owner">
            Owner (Full Control)
          </Select.Option>
        </Form.Select>

        <Button htmlType="submit" type="primary" loading={loading} block>
          Share
        </Button>
      </Form>

      {shares.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h4 style={{ marginBottom: "12px" }}>Current Collaborators</h4>
          <List
            dataSource={shares}
            renderItem={(share) => (
              <List.Item
                extra={
                  <Button
                    type="danger"
                    size="small"
                    onClick={() =>
                      handleRevokeShare(share.sharedWithUser?.id || share.sharedWithUserId)
                    }
                  >
                    Revoke
                  </Button>
                }
              >
                <div>
                  <div>
                    {share.sharedWithUser?.email ||
                      share.sharedWithUser?.username ||
                      "Unknown user"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    {share.permissionLevel}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
}



