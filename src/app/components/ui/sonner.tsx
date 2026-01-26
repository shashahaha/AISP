import { Toaster as Sonner } from "sonner";

const Toaster = () => {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 3000,
      }}
    />
  );
};

export { Toaster };
