import { Interruption } from "./interruption";

/**
 * A 404, for an address that matches no route and for every `notFound()` this application calls.
 *
 * **It says nothing about why**, and `story/[id]/page.tsx` is where that matters: a Story that does
 * not exist, one this reader may not see, and an id that is not a uuid all answer here, because
 * telling a stranger which of the three it was is telling them a private Story exists.
 */
export default function NotFound() {
  return (
    <Interruption heading="Not found">
      There is nothing at this address. It may have been moved, or the address may be wrong.
    </Interruption>
  );
}
