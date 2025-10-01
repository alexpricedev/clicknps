import { X } from "lucide-react";
import type { JSX } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

export interface AlertProps {
  type: AlertType;
  title: string;
  description?: string | JSX.Element;
  icon?: JSX.Element;
  dismissible?: boolean;
}

export const Alert = ({
  type,
  title,
  description,
  icon,
  dismissible = true,
}: AlertProps): JSX.Element => {
  const getIconBgClass = () => {
    switch (type) {
      case "success":
        return "bg-success/20";
      case "error":
        return "bg-error/20";
      case "warning":
        return "bg-warning/20";
      case "info":
        return "bg-info/20";
    }
  };

  return (
    <div
      role="alert"
      className={`alert alert-${type} alert-soft relative`}
      data-dismissible={dismissible}
    >
      {icon && (
        <div className="shrink-0">
          <div className={`${getIconBgClass()} rounded-full p-3`}>{icon}</div>
        </div>
      )}
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm">{description}</div>}
      </div>
      {dismissible && (
        <button
          type="button"
          className="btn btn-ghost btn-circle shrink-0"
          data-action="close-alert"
          aria-label="Close alert"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
