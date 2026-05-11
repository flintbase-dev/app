import { Search } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

export function GlobalSearch({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/console/search" className="max-w-md flex-1">
      <InputGroup className="h-8">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          name="q"
          defaultValue={defaultValue}
          placeholder="Jump to a page, model, request, invoice, or token id…"
        />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
