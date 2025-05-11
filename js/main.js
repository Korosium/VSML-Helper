//#region Constants
const AUTHOR_NAME = "Korosium";

const KBIT_TO_BINARY = 1024;
const BYTE_BIT_LENGTH = 8;

const PT_ENTRIES_SIZE_IN_BYTES = 512 / BYTE_BIT_LENGTH;
const PLT_ENTRIES_SIZE_IN_BYTES = 256 / BYTE_BIT_LENGTH;
//#endregion

//#region HTML Elements
let formated_pages = {}

const file_input = document.getElementById("file-input");

const vsml_magic_number = document.getElementById("vsml-magic-number");
const vsml_layout_type = document.getElementById("vsml-layout-type");
const vsml_page_size = document.getElementById("vsml-page-size");
const vsml_nb_of_pages = document.getElementById("vsml-nb-of-pages");
const vsml_nb_of_swap_pages = document.getElementById("vsml-nb-of-swap-pages");
const vsml_nb_of_bitmap_pages = document.getElementById("vsml-nb-of-bitmap-pages");
const vsml_nb_of_pt_pages = document.getElementById("vsml-nb-of-pt-pages");
const vsml_nb_of_plt_pages = document.getElementById("vsml-nb-of-plt-pages")
const vsml_page_used = document.getElementById("vsml-page-used");
const vsml_total_memory_size = document.getElementById("vsml-total-memory-size");
const vsml_pt_entry_page_per_pt_page = document.getElementById("vsml-pt-entry-page-per-pt-page");
const vsml_total_pt_entry = document.getElementById("vsml-total-pt-entry");

const vsml_plt_entry_per_plt_page = document.getElementById("vsml-plt-entry-per-plt-page");
const vsml_total_plt_entry = document.getElementById("vsml-total-plt-entry");

const page_select = document.getElementById("page-select");
const show_page = document.getElementById("show-page");
//#endregion

//#region Event Listeners
file_input.onchange = () => {
    const fr = new FileReader();
    fr.onload = () => {
        const filename = file_input.files[0].name;
        const b = Array.prototype.slice.call(new Uint8Array(fr.result));
        show_file_based_on_extension(b, filename);
    }
    fr.onerror = () => {
        console.log(fr.error);
    }
    fr.readAsArrayBuffer(file_input.files[0]);
}

page_select.onchange = () => {
    show_page_to_user(page_select.value);
}
//#endregion

//#region Functions

/**
 * Show the file to the user following certain rules depending on the extension.
 * 
 * @param {number[]} b         The file's bytes.
 * @param {string}   extension The file's extension.
 */
const show_file_based_on_extension = (b, filename) => {
    const extension = filename.split('.')[1];
    switch (extension) {
        case "vsml":
            show_vsml_file(b, filename);
            break;
        default:
            window.alert(`Files with the extension "${extension}" are not implemented yet.`);
    }
};

/**
 * Process the entire VSML file and show the first page, the Meta Page, when done.
 * 
 * @param {number[]} b        The VSML file's bytes.
 * @param {string}   filename The VSML filename.
 */
const show_vsml_file = (b, filename) => {
    const meta_page_info = {
        magic_number: to_UTF8(b.slice(0, 4)),
        layout_type: to_UTF8(b.slice(4, 8)),
        page_size: to_number(b.slice(8, 10)) * KBIT_TO_BINARY / BYTE_BIT_LENGTH,
        nb_of_pages: to_number(b.slice(10, 12)),
        nb_of_swap_pages: to_number(b.slice(12, 14)),
        nb_of_bitmap_pages: to_number(b.slice(14, 16)),
        nb_of_pt_pages: to_number(b.slice(16, 18)),
        nb_of_plt_pages: to_number(b.slice(18, 20))
    }

    // Meta Page
    vsml_magic_number.value = meta_page_info.magic_number;
    vsml_layout_type.value = meta_page_info.layout_type;
    vsml_page_size.value = meta_page_info.page_size;
    vsml_nb_of_pages.value = meta_page_info.nb_of_pages;
    vsml_nb_of_swap_pages.value = meta_page_info.nb_of_swap_pages;
    vsml_nb_of_bitmap_pages.value = meta_page_info.nb_of_bitmap_pages;
    vsml_nb_of_pt_pages.value = meta_page_info.nb_of_pt_pages;
    vsml_nb_of_plt_pages.value = meta_page_info.nb_of_plt_pages;

    // Other
    vsml_pt_entry_page_per_pt_page.value = meta_page_info.page_size / PT_ENTRIES_SIZE_IN_BYTES;
    vsml_total_pt_entry.value = (meta_page_info.page_size / PT_ENTRIES_SIZE_IN_BYTES) * meta_page_info.nb_of_pt_pages;
    vsml_plt_entry_per_plt_page.value = meta_page_info.page_size / PLT_ENTRIES_SIZE_IN_BYTES;
    vsml_total_plt_entry.value = (meta_page_info.page_size / PLT_ENTRIES_SIZE_IN_BYTES) * meta_page_info.nb_of_plt_pages;
    vsml_total_memory_size.value = meta_page_info.page_size * meta_page_info.nb_of_pages;

    const pages = get_all_pages_from_vsml(b, meta_page_info, filename);
    const keys = format_keys(Object.keys(pages));
    formated_pages = format_all_pages_from_vsml(pages, meta_page_info);

    fillSelect(page_select, keys);

    show_page_to_user(keys[0])
}

/**
 * Show a page to the user.
 * 
 * @param {string} key The key to show the right page to the user.
 */
const show_page_to_user = key => {
    let p = document.createElement("p");
    p.innerHTML = formated_pages[key];
    show_page.innerHTML = p.innerHTML;
}

/**
 * Get all the pages from the VSML file.
 * 
 * @param {number[]} b              The VSML file's bytes.
 * @param {Object}   meta_page_info The meta page info object created at the start.
 * @param {string}   filename       The VSML filename.
 * 
 * @returns {Object} All the pages from the VSML file.
 */
const get_all_pages_from_vsml = (b, meta_page_info, filename) => {
    const size = meta_page_info.page_size;

    // Meta Page
    let retval = {}
    retval[`[${1}/${meta_page_info.nb_of_pages}] Meta Page\nxxd -s 0 -l ${size} ${filename}`] = b.slice(0, size);
    let sum = 1;

    // Bitmap Pages
    for (let i = sum; i < sum + meta_page_info.nb_of_bitmap_pages; i++) {
        const temp = b.slice(i * size, i * size + size);
        retval[`[${i + 1}/${meta_page_info.nb_of_pages}] Bitmap Page # ${(i + 1) - sum}\nxxd -s 0x${(i*size).toString(16)} -l ${size} ${filename}`] = temp;
        vsml_page_used.value = get_pages_used(temp, meta_page_info.nb_of_pages).toString().replaceAll(',', ', ');
    }
    sum += meta_page_info.nb_of_bitmap_pages;

    // PT Pages
    for (let i = sum; i < sum + meta_page_info.nb_of_pt_pages; i++) {
        retval[`[${i + 1}/${meta_page_info.nb_of_pages}] PT Page # ${(i + 1) - sum}\nxxd -s 0x${(i*size).toString(16)} -l ${size} ${filename}`] = b.slice(i * size, i * size + size);
    }
    sum += meta_page_info.nb_of_pt_pages;

    // PLT Pages
    for (let i = sum; i < sum + meta_page_info.nb_of_plt_pages; i++) {
        retval[`[${i + 1}/${meta_page_info.nb_of_pages}] PLT Page # ${(i + 1) - sum}\nxxd -s 0x${(i*size).toString(16)} -l ${size} ${filename}`] = b.slice(i * size, i * size + size);
    }
    sum += meta_page_info.nb_of_plt_pages;

    // Data Pages
    for (let i = sum; i < meta_page_info.nb_of_pages; i++) {
        retval[`[${i + 1}/${meta_page_info.nb_of_pages}] Data Page # ${(i + 1) - sum}\nxxd -s 0x${(i*size).toString(16)} -l ${size} ${filename}`] = b.slice(i * size, i * size + size);
    }

    return retval;
}

/**
 * Format all the pages from the VSML file.
 * 
 * @param {Object} pages          The page object containing all the pages.
 * @param {Object} meta_page_info The meta page info object created at the start.
 * 
 * @returns {Object} The formated page object.
 */
const format_all_pages_from_vsml = (pages, meta_page_info) => {
    const keys = Object.keys(pages);
    const keys_f = format_keys(keys);
    console.log(keys)
    let retval = {}
    for (let i = 0; i < keys.length; i++) {
        retval[keys_f[i]] = format_page(pages[keys[i]], keys[i], meta_page_info.nb_of_pages, i * meta_page_info.page_size);
    }
    return retval;
}

/**
 * Format the keys so that we don't see the xxd command.
 * 
 * @param {string[]} keys All the keys for pagination.
 *  
 * @returns {string[]} The formated keys.
 */
const format_keys = keys => {
    let retval = [];
    for(let i = 0; i < keys.length; i++){
        retval.push(keys[i].split('\n')[0]);
    }
    return retval;
}

/**
 * Get all the page used in memory based on the bitmap page.
 * 
 * @param {number[]} bitmap_page The bitmap page's bytes.
 * @param {number}   nb_of_pages The total number of pages.
 * 
 * @returns {number[]} The pages used in memory.
 */
const get_pages_used = (bitmap_page, nb_of_pages) => {
    const bitmap_header = bitmap_page.slice(0, nb_of_pages / 8);
    let pages_used = [];
    for (let i = 0; i < bitmap_header.length; i++) {
        const n = bitmap_header[i];
        for (let j = 7; j >= 0; j--) {
            const res = (n >>> j) & 1;
            if (res === 1) {
                pages_used[pages_used.length] = i * 8 + (7 - j);
            }
        }
    }
    return pages_used;
}

/**
 * Convert a byte array to it's UTF-8 equivalent.
 * 
 * @param {number[]} b The byte array to convert.
 * 
 * @returns {string} The converted bytes.
 */
const to_UTF8 = b => new TextDecoder().decode(new Uint8Array(b).buffer);

/**
 * Convert two bytes to one number.
 * 
 * @param {number[]} b The two bytes to convert.
 *  
 * @returns {number} The converted bytes.
 */
const to_number = b => (b[0] * 256 + b[1]);

/**
 * Convert a byte to it's hex equivalent.
 * 
 * @param {number}             b   The byte to convert to hexadecimal.
 * @param {number | undefined} pad The expected length of the padded char.
 * 
 * @returns {string} The converted byte.
 */
const to_hex = (b, pad = 2) => b.toString(16).padStart(pad, '0');

/**
 * Format a page to show to the user later.
 * 
 * @param {number[]}           page        The page bytes.
 * @param {string}             title       The title of the page.
 * @param {number}             nb_of_pages The number of pages in total.
 * @param {number | undefined} offset      The offset to use to get the right address for the right page.
 * 
 * @returns {string} The formated page.
 */
const format_page = (page, title, nb_of_pages, offset = 0) => {
    let retval = `<pre>${title}</pre><pre>____________________________________________________________________</pre>`;
    for (let i = 0; i < page.length; i += 16) {
        let ascii = "";
        let hex = create_hex_header_tag(title, i);
        hex += to_hex(i + offset, 8) + ": ";

        let slice = page.slice(i, i + 16);
        for (let j = 0; j < slice.length; j++) {
            // Hex
            const bitmap_range = page.slice(0, nb_of_pages / 8);
            hex += create_span_header_tag(title, i, j, bitmap_range);
            hex += to_hex(slice[j]);
            hex += create_span_footer_tag(title, i, j, bitmap_range);
            if ((j + 1) % 2 === 0) hex += ' ';

            // ASCII
            ascii += format_to_ascii(slice[j]);
        }
        retval += hex + '  ' + ascii + "</pre>";
    }
    return retval;
}

/**
 * Create the hexadecimal pre header based on the title and the row index.
 * 
 * @param {string} title The title of the page.
 * @param {number} i     The row index.
 * 
 * @returns {string} The starting pre tag.
 */
const create_hex_header_tag = (title, i) => {
    if (title.indexOf("PT Page") > -1 && i % PT_ENTRIES_SIZE_IN_BYTES === 0) return `<pre style="color: #ff0088">`;
    if (title.indexOf("PLT Page") > -1 && i % PLT_ENTRIES_SIZE_IN_BYTES === 0) return `<pre style="color: #aa00aa">`;
    return "<pre>";
};

/**
 * Create the first span tag following the right rules.
 * 
 * @param {string}   title        The title of the page.
 * @param {number}   i            The row index.
 * @param {number}   j            The column index.
 * @param {number[]} bitmap_range The range of the bitmap.
 * 
 * @returns {string} The starting span tag.
 */
const create_span_header_tag = (title, i, j, bitmap_range) => {
    // Meta Page rules
    const n = i + j;
    if (n < 4 && title.indexOf("Meta Page") > -1) return `<span style="color: #ff4444">`;
    if (n >= 4 && n < 8 && title.indexOf("Meta Page") > -1) return `<span style="color: #00ff00">`;
    if (n >= 8 && n < 10 && title.indexOf("Meta Page") > -1) return `<span style="color: #4444ff">`;
    if (n >= 10 && n < 12 && title.indexOf("Meta Page") > -1) return `<span style="color: #ff8800">`;
    if (n >= 12 && n < 14 && title.indexOf("Meta Page") > -1) return `<span style="color: #bb00bb">`;
    if (n >= 14 && n < 16 && title.indexOf("Meta Page") > -1) return `<span style="color: #00ff88">`;
    if (n >= 16 && n < 18 && title.indexOf("Meta Page") > -1) return `<span style="color: #ffff00">`;
    if (n >= 18 && n < 20 && title.indexOf("Meta Page") > -1) return `<span style="color: #ff00ff">`;

    // Bitmap rules
    if (n < bitmap_range.length && title.indexOf("Bitmap") > -1) return `<span style="color: #00aaff">`;
    return "";
}

/**
 * Create the end tag for the first span following the right rules.
 * 
 * @param {string}   title        The title of the page.
 * @param {number}   i            The row index.
 * @param {number}   j            The column index.
 * @param {number[]} bitmap_range The range of the bitmap.
 * 
 * @returns {string} The ending tag if needed.
 */
const create_span_footer_tag = (title, i, j, bitmap_range) => {
    // Meta Page rules
    const n = i + j;
    if (n < 4 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 4 && n < 8 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 8 && n < 10 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 10 && n < 12 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 12 && n < 14 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 14 && n < 16 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 16 && n < 18 && title.indexOf("Meta Page") > -1) return `</span>`;
    if (n >= 18 && n < 20 && title.indexOf("Meta Page") > -1) return `</span>`;

    // Bitmap rules
    if (n < bitmap_range.length && title.indexOf("Bitmap") > -1) return `</span>`;
    return "";
}

/**
 * Convert a number to it's printable ASCII equivalent. 
 * 
 * @param {number} n The number to convert.
 * 
 * @returns {string} A printable ASCII char.
 */
const format_to_ascii = (n) => {
    if (n >= 32 && n <= 126) return String.fromCharCode(n);
    return '.';
}

/**
 * Populate a HTML select element with an array.
 * 
 * @param {HTMLSelectElement}   select The select element to populate.
 * @param {string[] | number[]} array  The array used to populate the select.
 */
const fillSelect = (select, array) => {
    // Remove previous options
    const length = page_select.options.length
    for (let i = 0; i < length; i++) {
        page_select.remove(page_select.options[i]);
    }

    // Add new options
    for (let i = 0; i < array.length; i++) {
        const option = document.createElement("option");
        option.value = array[i];
        option.innerHTML = array[i];
        select.append(option);
    }
}
//#endregion

//#region On Load

/**
 * Initialize the elements on the page before doing anything with them.
 */
const init = () => {
    // Meta Page
    vsml_magic_number.value = "";
    vsml_layout_type.value = "";
    vsml_page_size.value = "";
    vsml_nb_of_pages.value = "";
    vsml_nb_of_swap_pages.value = "";
    vsml_nb_of_bitmap_pages.value = "";
    vsml_nb_of_pt_pages.value = "";
    vsml_nb_of_plt_pages.value = "";
    vsml_page_used.value = "";

    // Other
    vsml_pt_entry_page_per_pt_page.value = "";
    vsml_total_pt_entry.value = "";
    vsml_plt_entry_per_plt_page.value = "";
    vsml_total_plt_entry.value = "";
    vsml_total_memory_size.value = "";

    // Footer
    document.getElementsByTagName("footer")[0].innerHTML += `<p>Copyright © ${new Date().getFullYear()} ${AUTHOR_NAME}</p>`;
}

/**
 * Run this function after the page has loaded.
 */
const main = () => {
    init();
}

window.onload = main;
//#endregion