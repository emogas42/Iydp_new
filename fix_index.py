import re

with open('/home/nazrin/Downloads/iydp/templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <header> ... </header>
new_header = """    <header>
        <nav class="fixed w-full z-50 glass-nav backdrop-blur-xl" aria-label="Primary">
            <div class="max-w-7xl mx-auto px-6 lg:px-8">
                <div class="flex justify-between h-20 items-center">
                    <a href="{{ url_for('home') }}" class="flex items-center gap-4">
                        <img src="{{ url_for('static', filename='logo.png') }}" alt="IYDP Logo"
                            class="h-24 w-auto drop-shadow-sm transition-transform hover:scale-105">
                        <div class="h-8 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div>
                        <div class="hidden sm:flex flex-col justify-center leading-tight">
                        </div>
                    </a>
                    <ul
                        class="hidden md:flex items-center space-x-6 font-bold text-[13px] uppercase tracking-wider list-none m-0 p-0">
                        <li>
                            <a href="{{ url_for('home') }}" class="nav-link text-[#00aef6] transition-all"
                                aria-current="page">Home</a>
                        </li>
                        <li class="relative group">
                            <a href="{{ url_for('home') }}#about"
                                class="nav-link text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all">
                                About <i class="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i>
                            </a>
                            <div class="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                                <div class="w-48 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2">
                                    <a href="{{ url_for('home') }}#about-who"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Who
                                        We Are</a>
                                    <a href="{{ url_for('home') }}#about-mission"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Mission
                                        & Vision</a>
                                    <a href="{{ url_for('home') }}#about-what"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">What
                                        We Do</a>
                                    <a href="{{ url_for('home') }}#about-team"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Our
                                        Team</a>
                                </div>
                            </div>
                        </li>

                        <li class="relative group">
                            <a href="{{ url_for('home') }}#opportunities"
                                class="nav-link text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all">
                                Opportunities <i class="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i>
                            </a>
                            <div class="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                                <div class="w-56 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2">
                                    <a href="{{ url_for('home') }}#opportunities"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Active
                                        Calls</a>
                                    <a href="{{ url_for('home') }}#erasmus"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Erasmus+</a>
                                    <a href="{{ url_for('home') }}#esc"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">ESC</a>
                                    <a href="{{ url_for('home') }}#opportunities-study"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Study
                                        Abroad</a>
                                    <a href="{{ url_for('home') }}#opportunities-local"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Local
                                        Opportunities</a>
                                </div>
                            </div>
                        </li>

                        <li class="relative group">
                            <a href="{{ url_for('home') }}#projects"
                                class="nav-link text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all">
                                Projects <i class="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i>
                            </a>
                            <div class="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                                <div class="w-48 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2">
                                    <a href="{{ url_for('home') }}#projects-ongoing"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Ongoing
                                        Projects</a>
                                    <a href="{{ url_for('home') }}#projects-completed"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Completed
                                        Projects</a>
                                </div>
                            </div>
                        </li>

                        <li>
                            <a href="{{ url_for('home') }}#news" class="nav-link text-slate-600 hover:text-slate-900 transition-all">News</a>
                        </li>
                        <li>
                            <a href="{{ url_for('home') }}#blog" class="nav-link text-slate-600 hover:text-slate-900 transition-all">Blog</a>
                        </li>

                        <li class="relative group">
                            <a href="{{ url_for('home') }}#relations"
                                class="nav-link text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all">
                                Relations <i class="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i>
                            </a>
                            <div class="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                                <div class="w-52 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2">
                                    <a href="{{ url_for('home') }}#relations-corporate"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Corporate
                                        Partners</a>
                                    <a href="{{ url_for('home') }}#relations-orgs"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Partner
                                        Organizations</a>
                                    <a href="{{ url_for('home') }}#relations-institutions"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Institutions</a>
                                </div>
                            </div>
                        </li>

                        <li class="relative group">
                            <a href="{{ url_for('home') }}#contact"
                                class="nav-link text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all">
                                Contact <i class="fa-solid fa-chevron-down text-[10px]" aria-hidden="true"></i>
                            </a>
                            <div class="absolute top-full right-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                                <div class="w-40 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2">
                                    <a href="{{ url_for('home') }}#faq"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">FAQ</a>
                                    <a href="{{ url_for('home') }}#contact"
                                        class="block px-4 py-2 text-slate-600 hover:text-[#00aef6] hover:bg-slate-50 rounded-lg transition-colors">Contact
                                        Us</a>
                                </div>
                            </div>
                        </li>

                        <li>
                            <a href="{{ url_for('home') }}#join"
                                class="relative inline-flex items-center justify-center py-2 px-6 overflow-hidden font-bold text-white transition-all duration-300 rounded-xl group shadow-md shadow-[#00aef6]/20 bg-[#00aef6] hover:bg-iydpPurple hover:shadow-lg hover:shadow-[#6f3d90]/30 hover:-translate-y-0.5 ml-2">
                                <span class="relative flex items-center gap-2">JOIN IYDP</span>
                            </a>
                        </li>
                    </ul>

                    <div class="md:hidden">
                        <button id="mobile-menu-btn" type="button" aria-controls="mobile-menu" aria-expanded="false"
                            aria-label="Open menu"
                            class="p-3 text-slate-800 bg-slate-100 rounded-xl hover:bg-[#00aef6] hover:text-white transition-all">
                            <i class="fa-solid fa-bars-staggered text-lg" aria-hidden="true"></i>
                        </button>
                    </div>

                </div>
            </div>
        </nav>
    </header>"""

new_mobile_menu = """    <div id="mobile-menu"
        class="fixed inset-0 z-[110] bg-white transform translate-x-full transition-transform duration-300 ease-in-out md:hidden overflow-y-auto"
        role="dialog" aria-modal="true" aria-hidden="true">
        <div class="flex flex-col h-full p-8">
            <div class="flex justify-between items-center mb-12">
                <img src="{{ url_for('static', filename='logo.png') }}" alt="Logo" class="h-10">
                <button id="close-menu-btn" type="button" aria-label="Close menu"
                    class="text-2xl text-slate-800 focus:outline-none p-2">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>

            <nav aria-label="Mobile">
                <ul
                    class="flex flex-col space-y-5 font-black text-[15px] uppercase tracking-wider text-slate-800 list-none m-0 p-0">
                    <li><a href="{{ url_for('home') }}"
                            class="mobile-link text-[#00aef6] flex items-center justify-between">Home <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#about" class="mobile-link flex items-center justify-between">About <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#opportunities" class="mobile-link flex items-center justify-between">Opportunities <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#projects" class="mobile-link flex items-center justify-between">Projects <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#news" class="mobile-link flex items-center justify-between">News <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#blog" class="mobile-link flex items-center justify-between">Blog <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#relations" class="mobile-link flex items-center justify-between">External Relations <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                    <li><a href="{{ url_for('home') }}#contact" class="mobile-link flex items-center justify-between">Contact & FAQ <i
                                class="fa-solid fa-chevron-right text-xs text-slate-300" aria-hidden="true"></i></a>
                    </li>
                </ul>
            </nav>

            <div class="mt-auto pt-8">
                <a href="{{ url_for('home') }}#join"
                    class="mobile-link w-full inline-flex items-center justify-center py-5 bg-[#00aef6] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-[#00aef6]/30 transition-transform active:scale-95">
                    JOIN IYDP
                </a>
            </div>
        </div>
    </div>"""

# Replace in content by regex
content = re.sub(r' +<header>.*?</header>', new_header, content, flags=re.DOTALL)
content = re.sub(r' +<div id="mobile-menu".*?</div> *\n *</div> *\n *</div>', new_mobile_menu, content, flags=re.DOTALL)

with open('/home/nazrin/Downloads/iydp/templates/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
