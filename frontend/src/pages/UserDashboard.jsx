import { useNavigate } from "react-router-dom";
import CustomButton from "../components/CustomButton";

function UserDashboard() {
  const navigate = useNavigate();
  return (
    <>
      <h1>User Dashboard</h1>
      <CustomButton
        $backgroundColor="var(--color-grey-700)"
        $hoverColor="var(--color-grey-600)"
        $textColor="var(--color-grey-100)"
        onClick={() => navigate("/generate-credentials")}
      >
        Generate Credentials
      </CustomButton>
    </>
  );
}

export default UserDashboard;
