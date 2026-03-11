import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/src/components/layout/NotificationBell";

vi.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    role: "admin",
  }),
}));

const mocks = vi.hoisted(() => {
  const eqMock = vi.fn(async () => ({ count: 3 }));
  const orMock = vi.fn(() => ({ eq: eqMock }));
  const selectMock = vi.fn(() => ({ or: orMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const subscribeMock = vi.fn(() => ({}));
  const onMock = vi.fn(() => ({ subscribe: subscribeMock }));
  const channelMock = vi.fn(() => ({ on: onMock }));
  const removeChannelMock = vi.fn();
  return { eqMock, orMock, selectMock, fromMock, subscribeMock, onMock, channelMock, removeChannelMock };
});

vi.mock("@/src/lib/supabase", () => ({
  supabase: {
    from: mocks.fromMock,
    channel: mocks.channelMock,
    removeChannel: mocks.removeChannelMock,
  },
}));

describe("NotificationBell", () => {
  it("renders label and unread count badge", async () => {
    render(<NotificationBell />);

    expect(screen.getByRole("link", { name: /notifications/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    expect(mocks.fromMock).toHaveBeenCalledWith("notifications");
    expect(mocks.channelMock).toHaveBeenCalledWith("notifications-bell-u1");
  });
});
