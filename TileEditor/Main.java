import java.awt.*;
import javax.swing.*;

public class Main {
	static JMenuBar		mMenuBar;
	static JMenu		mTileSet;
	static JMenu		mFile;
	static JMenu		mEdit;
	static JMenuItem	mMenuItem;
	
	public static void main (String[] args)
	{
		JFrame frame = new JFrame ();
		TileEditor tileEditor = new TileEditor ();
		
		frame.setSize (1280, 1040);
		frame.setVisible (true);
		frame.setResizable (false);
		frame.add (tileEditor);
		
		mMenuBar = new JMenuBar ();
		mFile = new JMenu ("File");
		
		mMenuItem = new JMenuItem ("New");
		mMenuItem.setActionCommand ("new");
		mMenuItem.addActionListener (tileEditor);
		mFile.add (mMenuItem);
		
		mMenuItem = new JMenuItem ("Save");
		mMenuItem.setActionCommand ("save");
		mMenuItem.addActionListener (tileEditor);
		mFile.add (mMenuItem);
		
		mMenuItem = new JMenuItem ("Open");
		mMenuItem.setActionCommand ("open");
		mMenuItem.addActionListener (tileEditor);
		mFile.add (mMenuItem);
		
		mMenuItem = new JMenuItem ("Close");
		mMenuItem.setActionCommand ("close");
		mMenuItem.addActionListener (tileEditor);
		mFile.add (mMenuItem);
		
		mMenuBar.add (mFile);
		
		mEdit = new JMenu ("Edit");
		mMenuBar.add (mEdit);
		
		mMenuItem = new JMenuItem ("Load Background");
		mMenuItem.setActionCommand ("loadBackground");
		mMenuItem.addActionListener (tileEditor);
		mEdit.add (mMenuItem);
		
		frame.setJMenuBar (mMenuBar);
		
		mTileSet = new JMenu ("Tilesets");
		mMenuBar.add (mTileSet);
		
		mMenuItem = new JMenuItem ("Load Tileset");
		mMenuItem.setActionCommand ("loadTileset");
		mMenuItem.addActionListener (tileEditor);
		mTileSet.add (mMenuItem);
		
		frame.setJMenuBar (mMenuBar);
		
		frame.pack ();
		frame.setDefaultCloseOperation (JFrame.EXIT_ON_CLOSE);
		
		if (args.length > 0)
			tileEditor.loadFile (System.getProperty ("user.dir") + "/" + args[0]);
		
		while (true){
			tileEditor.run ();
		}
	}
}