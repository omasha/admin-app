// The admin app: Refine (data, login, permissions) + Mantine 8 screens + react-router.

import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { Authenticated, CanAccess, Refine, type NotificationProvider } from "@refinedev/core";
import routerProvider, { UnsavedChangesNotifier } from "@refinedev/react-router";
import { notifications } from "@mantine/notifications";

import { dataProvider } from "./api/dataProvider";
import { accessControlProvider, authProvider } from "./auth/providers";
import { Layout } from "./components/Layout";
import { LoginCallback, LoginPage, NoAccess, StartPage } from "./pages/auth";
import { ArrangeBlocks } from "./pages/arrangeBlocks";
import { ContentBlockForm, ContentBlockList } from "./pages/contentBlocks";
import { EmbeddedFormForm, EmbeddedFormList } from "./pages/embeddedForms";
import { GrantCreate, GrantList } from "./pages/grants";
import { UserEdit, UserList, UserPassword, UserShow } from "./pages/users";
import { WidgetForm, WidgetList } from "./pages/widgets";

// Refine's success/error messages, shown as Mantine notifications.
const notificationProvider: NotificationProvider = {
  open: ({ key, message, description, type }) => {
    notifications.show({
      id: key, title: message, message: description ?? "",
      color: type === "error" ? "bmpRed" : "bmpGreen",
    });
  },
  close: (key) => notifications.hide(key),
};

// The content resources: list, create and edit pages each.
const resourceDefs = [
  { name: "content-blocks", List: ContentBlockList, Form: ContentBlockForm },
  { name: "widgets", List: WidgetList, Form: WidgetForm },
  { name: "embedded-forms", List: EmbeddedFormList, Form: EmbeddedFormForm },
];

function Guarded({ resource, action }: { resource: string; action: string }) {
  return (
    <CanAccess resource={resource} action={action} fallback={<NoAccess />}>
      <Outlet />
    </CanAccess>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Refine
        dataProvider={dataProvider}
        authProvider={authProvider}
        accessControlProvider={accessControlProvider}
        notificationProvider={notificationProvider}
        routerProvider={routerProvider}
        resources={[
          ...resourceDefs.map(({ name }) => ({
            name, list: `/${name}`, create: `/${name}/create`, edit: `/${name}/edit/:id`,
          })),
          { name: "users", list: "/users", show: "/users/show/:id", edit: "/users/edit/:id" },
          { name: "user-profiles" },
          { name: "grants", list: "/grants", create: "/grants/create" },
        ]}
        options={{ syncWithLocation: true, warnWhenUnsavedChanges: true, disableTelemetry: true }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/callback" element={<LoginCallback />} />
          <Route element={<Authenticated key="app" redirectOnFail="/login"><Layout /></Authenticated>}>
            <Route index element={<StartPage />} />
            {resourceDefs.map(({ name, List, Form }) => (
              <Route key={name} path={`/${name}`}>
                <Route element={<Guarded resource={name} action="list" />}>
                  <Route index element={<List />} />
                </Route>
                <Route element={<Guarded resource={name} action="create" />}>
                  <Route path="create" element={<Form action="create" />} />
                </Route>
                <Route element={<Guarded resource={name} action="edit" />}>
                  <Route path="edit/:id" element={<Form action="edit" />} />
                </Route>
              </Route>
            ))}
            <Route path="/content-blocks/arrange" element={<Guarded resource="content-blocks" action="edit" />}>
              <Route index element={<ArrangeBlocks />} />
            </Route>
            <Route path="/users">
              <Route element={<Guarded resource="users" action="list" />}>
                <Route index element={<UserList />} />
              </Route>
              <Route element={<Guarded resource="users" action="show" />}>
                <Route path="show/:id" element={<UserShow />} />
              </Route>
              <Route element={<Guarded resource="users" action="edit" />}>
                <Route path="edit/:id" element={<UserEdit />} />
              </Route>
              <Route element={<Guarded resource="users" action="edit" />}>
                <Route path="password/:id" element={<UserPassword />} />
              </Route>
            </Route>
            <Route path="/grants">
              <Route element={<Guarded resource="grants" action="list" />}>
                <Route index element={<GrantList />} />
              </Route>
              <Route element={<Guarded resource="grants" action="create" />}>
                <Route path="create" element={<GrantCreate />} />
              </Route>
            </Route>
            <Route path="*" element={<NoAccess />} />
          </Route>
        </Routes>
        <UnsavedChangesNotifier />
      </Refine>
    </BrowserRouter>
  );
}
