interface BadgeProps {
  renderBadgeContent: () => JSX.Element;
}

const Badge = (props: BadgeProps) => {
  const { renderBadgeContent } = props;

  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
      {renderBadgeContent()}
    </span>
  );
};

export default Badge;
