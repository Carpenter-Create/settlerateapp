import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Methodology Page - Redirect
 * 
 * Methodology content has been consolidated into /how-it-works.
 * This page redirects to the Core Methodology section.
 */

export default function Methodology() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/how-it-works#core-methodology", { replace: true });
  }, [navigate]);

  return null;
}
