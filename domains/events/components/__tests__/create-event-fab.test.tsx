import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows the menu links when the FAB button is clicked", async () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    await userEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.getByText("New Series")).toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
  });

  it("hides the menu links when the menu is dismissed", async () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    await userEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(
      screen.getByRole("button", { name: /close menu/i, hidden: true })
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("New Series")).not.toBeInTheDocument();
  });

  it("New Series link points to /series/create", async () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    await userEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.getByText("New Series").closest("a")).toHaveAttribute(
      "href",
      "/series/create"
    );
  });

  it("New Event link points to /events/create", async () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={true} />);
    await userEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.getByText("New Event").closest("a")).toHaveAttribute(
      "href",
      "/events/create"
    );
  });

  it("hides New Series for EVENT_CREATOR (canCreateSeries=false)", async () => {
    render(<CreateEventFAB isOrganiser={true} canCreateSeries={false} />);
    await userEvent.click(screen.getByRole("button", { name: /create new/i }));
    expect(screen.queryByText("New Series")).not.toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
  });
});
