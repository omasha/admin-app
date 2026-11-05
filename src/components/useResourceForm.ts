// One form pattern for every resource's create and edit pages:
//   Refine's useForm   loads the record and saves it through the data provider
//   Mantine's useForm  holds what's typed, and shows each field's error
//
// After a save the page shows the record as the API stored it (cleaned HTML and all), and the
// API's field errors (422 `errors`) appear under the matching fields.

import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm as useRefineForm, type BaseRecord, type HttpError } from "@refinedev/core";
import { useForm as useMantineForm } from "@mantine/form";

type Options<TValues, TRecord> = {
  resource: string;
  action: "create" | "edit";
  id?: string;
  initialValues: TValues;
  fromRecord: (record: TRecord) => TValues; // what the API sent → the form's values
  toPayload: (values: TValues) => unknown; // the form's values → what the API takes
};

export function useResourceForm<TValues extends Record<string, unknown>, TRecord extends BaseRecord>({
  resource, action, id, initialValues, fromRecord, toPayload,
}: Options<TValues, TRecord>) {
  const navigate = useNavigate();
  const form = useMantineForm<TValues>({ mode: "controlled", initialValues });
  const refine = useRefineForm<TRecord, HttpError, Record<string, unknown>>({
    resource,
    action,
    id,
    redirect: false,
    successNotification: () => ({ message: "Saved", type: "success" }),
    errorNotification: (error) => ({ message: error?.message ?? "Couldn't save", type: "error" }),
  });

  const record = refine.query?.data?.data;
  const loadedAt = refine.query?.dataUpdatedAt;
  useEffect(() => {
    if (record) {
      const values = fromRecord(record);
      form.setValues(values);
      form.resetDirty(values);
    }
    // fromRecord/form are stable enough for this; reload only when a new answer arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAt]);

  const onSubmit = form.onSubmit(async (values) => {
    form.clearErrors();
    try {
      const saved = await refine.onFinish(toPayload(values) as Record<string, unknown>);
      const savedRecord = saved && "data" in saved ? (saved.data as TRecord) : undefined;
      if (action === "create" && savedRecord?.id !== undefined) {
        navigate(`/${resource}/edit/${savedRecord.id}`, { replace: true });
      } else if (savedRecord) {
        form.setValues(fromRecord(savedRecord));
        form.resetDirty();
      }
    } catch (error) {
      const fieldErrors = (error as HttpError)?.errors;
      if (fieldErrors) {
        form.setErrors(Object.fromEntries(
          Object.entries(fieldErrors).map(([field, messages]) => [field, Array.isArray(messages) ? messages.join(" ") : String(messages)]),
        ));
      }
    }
  });

  return {
    form,
    onSubmit,
    record,
    loading: refine.formLoading,
    loadError: refine.query?.error,
    saving: refine.mutation.isPending,
  };
}
