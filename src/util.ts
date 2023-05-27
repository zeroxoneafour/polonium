let debug: boolean = true;

function printDebug(str: string, isError: boolean) {
    if (isError) {
        print("Polonium ERR: " + str);
    } else if (debug) {
        print("Polonium DBG: " + str);
    }
}
