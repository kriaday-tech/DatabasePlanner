import { Modal, Button, Banner, Typography } from "@douyinfe/semi-ui";

export default function ConflictDialog({
  visible,
  conflictData,
  onResolve,
  onClose,
}) {
  if (!conflictData) return null;

  const { localChanges, serverVersion } = conflictData;

  return (
    <Modal
      title="Conflict Detected"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Banner
        type="warning"
        description={
          <div>
            <Typography.Text strong>
              This diagram was modified by another user
            </Typography.Text>
            <br />
            <Typography.Text>
              Modified by: {serverVersion.lastModifiedBy || "Unknown user"}
            </Typography.Text>
            <br />
            <Typography.Text>
              at {new Date(serverVersion.lastModified).toLocaleString()}
            </Typography.Text>
          </div>
        }
      />

      <div style={{ marginTop: "16px" }}>
        <Typography.Text strong>Resolution Options:</Typography.Text>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <Button block onClick={() => onResolve("keep-server")}>
            Use Server Version (Discard My Changes)
          </Button>

          <Button
            block
            type="warning"
            onClick={() => onResolve("keep-local")}
          >
            Use My Version (Override Server)
          </Button>

          <Button block type="tertiary" onClick={() => onResolve("view-diff")}>
            View Differences
          </Button>
        </div>
      </div>
    </Modal>
  );
}



