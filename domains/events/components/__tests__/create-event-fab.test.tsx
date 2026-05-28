import { render, screen, fireEvent } from "@testing-library/react";
import { CreateEventFAB } from "@/domains/events/components/create-event-fab";

describe("CreateEventFAB", () => {
  it("renders nothing when isOrganiser is false", () => {
    const { container } = render(
      <CreateEventFAB isOrganiser={false} canCreateSeries={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the FAB button for organisers", () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    expect(
      screen.getByRole("button", { name: /create new/i })
    ).toBeInTheDocument();
  });

  it("shows the menu links when the FAB button is clicked", () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    fireEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.getByText("New Series")).toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
  });

  it("hides the menu links when the FAB is clicked again", () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    const btn = screen.getByRole("button", { name: /create new/i });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.queryByText("New Series")).not.toBeInTheDocument();
  });

  it("New Series link points to /series/create", () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    fireEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.getByText("New Series").closest("a")).toHaveAttribute(
      "href",
      "/series/create"
    );
  });

  it("New Event link points to /events/create", () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    fireEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.getByText("New Event").closest("a")).toHaveAttribute(
      "href",
      "/events/create"
    );
  });

  it("hides New Series for EVENT_CREATOR (canCreateSeries=false)", () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={false} />);
    fireEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.queryByText("New Series")).not.toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
  });
});
