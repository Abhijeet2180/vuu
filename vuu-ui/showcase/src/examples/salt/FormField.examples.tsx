import {
  FormField,
  FormFieldLabel,
  FormFieldProps,
  Input,
} from "@salt-ds/core";

export const Default = (props: FormFieldProps) => {
  return (
    <>
      <FormField {...props}>
        <FormFieldLabel>Default Form Field label</FormFieldLabel>
        <Input defaultValue="Value" />
      </FormField>
      <div style={{ height: 40 }} />
    </>
  );
};
