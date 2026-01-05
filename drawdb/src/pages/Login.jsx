import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { Button, Form, Toast } from "@douyinfe/semi-ui";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(values.email, values.password);
      } else {
        result = await register(
          values.username,
          values.email,
          values.password,
        );
      }

      if (result.success) {
        Toast.success(`${isLogin ? "Login" : "Registration"} successful!`);
        navigate("/editor");
      } else {
        Toast.error(result.error);
      }
    } catch (error) {
      Toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          {isLogin ? "Login to DrawDB" : "Register for DrawDB"}
        </h2>

        <Form onSubmit={handleSubmit} layout="vertical">
          {!isLogin && (
            <Form.Input
              field="username"
              label="Username"
              placeholder="Enter username"
              rules={[{ required: true, message: "Username is required" }]}
            />
          )}

          <Form.Input
            field="email"
            label="Email"
            type="email"
            placeholder="Enter email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email format" },
            ]}
          />

          <Form.Input
            field="password"
            label="Password"
            type="password"
            mode="password"
            placeholder="Enter password"
            rules={[
              { required: true, message: "Password is required" },
              {
                min: 6,
                message: "Password must be at least 6 characters",
              },
            ]}
          />

          <Button
            htmlType="submit"
            type="primary"
            block
            loading={loading}
            style={{ marginTop: "16px" }}
          >
            {isLogin ? "Login" : "Register"}
          </Button>
        </Form>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <Button type="tertiary" onClick={() => setIsLogin(!isLogin)}>
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </Button>
        </div>
      </div>
    </div>
  );
}



