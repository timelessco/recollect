interface BadgeProps {
  label: string;
}

const Badge = (props: BadgeProps) => {
  const { label } = props;

  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
      {label}
    </span>
  );
};

export default Badge;
