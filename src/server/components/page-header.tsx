import type { JSX } from "react";

export interface PageHeaderProps {
  title: string | JSX.Element;
  description?: string | JSX.Element;
  children?: JSX.Element | JSX.Element[];
}

export const PageHeader = ({
  title,
  description,
  children,
}: PageHeaderProps): JSX.Element => {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
      <div className="flex-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-neutral-content mt-2">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {children}
        </div>
      )}
    </div>
  );
};
