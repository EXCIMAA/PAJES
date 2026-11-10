import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function RetourButton() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="btn-secondary btn-md flex items-center gap-2 mb-4"
    >
      <ArrowLeft className="w-4 h-4" /> Retour
    </button>
  );
}
